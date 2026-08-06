import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  handleWebsiteBotMessage,
  type WidgetBotContext,
} from "@/lib/widgetBot";
import {
  hashVisitorSessionToken,
  normalizeWidgetOrigin,
  verifyWidgetAccessToken,
} from "@/lib/widgetSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_REQUEST_SIZE_BYTES = 25_000;
const MESSAGE_HISTORY_LIMIT = 100;

type MessagesRouteProps = {
  params: Promise<{
    widgetKey: string;
  }>;
};

type WidgetMessageRequestBody = {
  accessToken?: string;
  visitorSessionToken?: string;
  conversationId?: string;
  clientMessageId?: string;
  message?: string;
};

function getRequestOrigin(
  request: NextRequest
): string | null {
  const originHeader = request.headers.get("origin");

  if (originHeader) {
    const origin = normalizeWidgetOrigin(originHeader);

    if (origin) {
      return origin;
    }
  }

  const refererHeader =
    request.headers.get("referer");

  if (refererHeader) {
    return normalizeWidgetOrigin(refererHeader);
  }

  return null;
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Widget-Access-Token",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, max-age=0",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function normalizeRequiredText(
  value: unknown,
  maximumLength: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > maximumLength
  ) {
    return null;
  }

  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  maximumLength: number
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maximumLength);
}

function getAccessToken(
  request: NextRequest,
  bodyAccessToken?: string
): string {
  return (
    request.headers.get(
      "x-widget-access-token"
    ) ??
    bodyAccessToken ??
    ""
  );
}

function isPrismaUniqueError(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseBotContext(
  value: unknown
): WidgetBotContext {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as WidgetBotContext;
}

async function getCompany(
  widgetKey: string,
  companyId: string
) {
  return prisma.company.findFirst({
    where: {
      id: companyId,
      widgetKey,
      isActive: true,
    },
    select: {
      id: true,
      widgetKey: true,
      botEnabled: true,

      widgetSettings: {
        select: {
          isActive: true,
          enableArabic: true,
          requireConsent: true,
          collectName: true,
          collectPhone: true,
          collectEmail: true,
          humanHandoffEnabled: true,
          whatsappHandoffEnabled: true,
          whatsappHandoffNumber: true,
        },
      },

      programmes: {
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          fee: true,
          duration: true,
        },
      },

      botFaqs: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          question: true,
          answer: true,
          language: true,
          category: true,
          keywords: true,
        },
      },
    },
  });
}

async function getAuthorizedVisitor({
  companyId,
  visitorSessionToken,
}: {
  companyId: string;
  visitorSessionToken: string;
}) {
  let sessionTokenHash: string;

  try {
    sessionTokenHash = hashVisitorSessionToken(
      visitorSessionToken
    );
  } catch {
    return null;
  }

  return prisma.websiteVisitor.findFirst({
    where: {
      companyId,
      sessionTokenHash,
    },
    select: {
      id: true,
      language: true,
    },
  });
}

async function getConversation({
  companyId,
  visitorId,
  conversationId,
}: {
  companyId: string;
  visitorId: string;
  conversationId: string;
}) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      companyId,
      websiteVisitorId: visitorId,
      channel: "WEBSITE",
    },
    select: {
      id: true,
      companyId: true,
      leadId: true,
      assignedToId: true,
      customerPhone: true,
      customerName: true,
      customerEmail: true,
      language: true,
      status: true,
      currentStep: true,
      botActive: true,
      contextData: true,
      handoffRequestedAt: true,
      lastMessageAt: true,

      assignedTo: {
        select: {
          id: true,
          name: true,
          availability: true,
        },
      },
    },
  });
}

async function getConversationMessages({
  companyId,
  conversationId,
}: {
  companyId: string;
  conversationId: string;
}) {
  return prisma.message.findMany({
    where: {
      companyId,
      conversationId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: MESSAGE_HISTORY_LIMIT,
    select: {
      id: true,
      clientMessageId: true,
      sender: true,
      senderUserId: true,
      type: true,
      content: true,
      mediaUrl: true,
      status: true,
      createdAt: true,

      senderUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function OPTIONS(
  request: NextRequest
): Promise<Response> {
  const origin = getRequestOrigin(request);

  if (!origin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Website origin could not be identified.",
      },
      {
        status: 400,
      }
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders(origin),
  });
}

export async function GET(
  request: NextRequest,
  { params }: MessagesRouteProps
): Promise<Response> {
  const { widgetKey } = await params;
  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Website origin could not be identified.",
      },
      {
        status: 400,
      }
    );
  }

  const corsHeaders =
    createCorsHeaders(requestOrigin);

  try {
    const accessToken = getAccessToken(request);

    const accessPayload =
      verifyWidgetAccessToken(accessToken);

    if (!accessPayload) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Widget access token is invalid or expired.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    if (
      accessPayload.widgetKey !== widgetKey ||
      accessPayload.origin !== requestOrigin
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Widget access is not authorized.",
        },
        {
          status: 403,
          headers: corsHeaders,
        }
      );
    }

    const visitorSessionToken =
      normalizeRequiredText(
        request.nextUrl.searchParams.get(
          "visitorSessionToken"
        ),
        300
      );

    const conversationId =
      normalizeRequiredText(
        request.nextUrl.searchParams.get(
          "conversationId"
        ),
        200
      );

    if (
      !visitorSessionToken ||
      !conversationId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Visitor session and conversation are required.",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const company = await getCompany(
      widgetKey,
      accessPayload.companyId
    );

    if (
      !company ||
      company.widgetSettings?.isActive === false
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Widget is unavailable.",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    const visitor =
      await getAuthorizedVisitor({
        companyId: company.id,
        visitorSessionToken,
      });

    if (!visitor) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Visitor session is invalid.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const conversation =
      await getConversation({
        companyId: company.id,
        visitorId: visitor.id,
        conversationId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Conversation was not found.",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

 const now = new Date();

const messages =
  await getConversationMessages({
    companyId: company.id,
    conversationId: conversation.id,
  });

await prisma.$transaction([
  prisma.conversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      visitorLastReadAt: now,
    },
  }),

  prisma.websiteVisitor.update({
    where: {
      id: visitor.id,
    },
    data: {
      lastSeenAt: now,
    },
  }),
]);
    return NextResponse.json(
      {
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            status: conversation.status,
            currentStep:
              conversation.currentStep,
            botActive:
              conversation.botActive,
            lastMessageAt:
              conversation.lastMessageAt,

            assignedAgent:
              conversation.assignedTo
                ? {
                    id:
                      conversation
                        .assignedTo.id,
                    name:
                      conversation
                        .assignedTo.name,
                    availability:
                      conversation
                        .assignedTo
                        .availability,
                  }
                : null,
          },

          messages,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(
      "Widget messages GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Conversation messages could not be loaded.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: MessagesRouteProps
): Promise<Response> {
  const { widgetKey } = await params;
  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Website origin could not be identified.",
      },
      {
        status: 400,
      }
    );
  }

  const corsHeaders =
    createCorsHeaders(requestOrigin);

  const contentLength = Number(
    request.headers.get("content-length") ?? 0
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_SIZE_BYTES
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Request is too large.",
      },
      {
        status: 413,
        headers: corsHeaders,
      }
    );
  }

  try {
    let body: WidgetMessageRequestBody;

    try {
      body =
        (await request.json()) as WidgetMessageRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Request body is not valid JSON.",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const accessToken = getAccessToken(
      request,
      body.accessToken
    );

    const accessPayload =
      verifyWidgetAccessToken(accessToken);

    if (!accessPayload) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Widget access token is invalid or expired.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    if (
      accessPayload.widgetKey !== widgetKey ||
      accessPayload.origin !== requestOrigin
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Widget access is not authorized.",
        },
        {
          status: 403,
          headers: corsHeaders,
        }
      );
    }

    const visitorSessionToken =
      normalizeRequiredText(
        body.visitorSessionToken,
        300
      );

    const conversationId =
      normalizeRequiredText(
        body.conversationId,
        200
      );

    const message =
      normalizeRequiredText(
        body.message,
        MAX_MESSAGE_LENGTH
      );

    const clientMessageId =
      normalizeOptionalText(
        body.clientMessageId,
        150
      ) ?? randomUUID();

    if (
      !visitorSessionToken ||
      !conversationId ||
      !message
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Visitor session, conversation and message are required.",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const company = await getCompany(
      widgetKey,
      accessPayload.companyId
    );

    if (
      !company ||
      company.widgetSettings?.isActive === false
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Widget is unavailable.",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    const visitor =
      await getAuthorizedVisitor({
        companyId: company.id,
        visitorSessionToken,
      });

    if (!visitor) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Visitor session is invalid.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const conversation =
      await getConversation({
        companyId: company.id,
        visitorId: visitor.id,
        conversationId,
      });

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Conversation was not found.",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    if (
      conversation.status === "CLOSED" ||
      conversation.status === "SPAM"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This conversation is closed.",
        },
        {
          status: 409,
          headers: corsHeaders,
        }
      );
    }

    const existingCustomerMessage =
      await prisma.message.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId:
              conversation.id,
            clientMessageId,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingCustomerMessage) {
      const messages =
        await getConversationMessages({
          companyId: company.id,
          conversationId:
            conversation.id,
        });

      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          data: {
            conversation: {
              id: conversation.id,
              status:
                conversation.status,
              currentStep:
                conversation.currentStep,
              botActive:
                conversation.botActive,
            },
            messages,
          },
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    const settings = {
      enableArabic:
        company.widgetSettings
          ?.enableArabic ?? false,

      requireConsent:
        company.widgetSettings
          ?.requireConsent ?? true,

      collectName:
        company.widgetSettings
          ?.collectName ?? true,

      collectPhone:
        company.widgetSettings
          ?.collectPhone ?? true,

      collectEmail:
        company.widgetSettings
          ?.collectEmail ?? true,

      humanHandoffEnabled:
        company.widgetSettings
          ?.humanHandoffEnabled ?? true,

      whatsappHandoffEnabled:
        company.widgetSettings
          ?.whatsappHandoffEnabled ?? true,
    };

    const shouldRunBot =
      company.botEnabled &&
      conversation.botActive &&
      conversation.status === "BOT_ACTIVE";

    const decision = shouldRunBot
      ? handleWebsiteBotMessage({
          message,
          currentStep:
            conversation.currentStep,
          language:
            conversation.language,
          contextData:
            conversation.contextData,
          settings,
          programmes:
            company.programmes,
          faqs: company.botFaqs,
        })
      : null;

    const now = new Date();

let nextStatus:
  | "BOT_ACTIVE"
  | "WAITING_FOR_AGENT"
  | "AGENT_ACTIVE"
  | "RESOLVED"
  | "CLOSED"
  | "SPAM" = conversation.status;

    let nextBotActive =
      conversation.botActive;

    let nextCurrentStep =
      conversation.currentStep;

    let nextLanguage =
      conversation.language;

    let nextContext =
      parseBotContext(
        conversation.contextData
      );

    let shouldNotifyAgents = false;
    let notificationType:
      | "NEW_MESSAGE"
      | "HANDOFF_REQUESTED" =
      "NEW_MESSAGE";

    if (decision) {
      nextCurrentStep =
        decision.nextStep;

      nextLanguage =
        decision.language;

      nextContext =
        decision.contextData;

      /*
       * Treat every completed lead handoff as a waiting
       * conversation. This also protects the flow if the bot
       * returns leadReady/WAITING_FOR_AGENT but the explicit
       * handoffRequested flag is unexpectedly false.
       */
      const handoffRequested =
        decision.handoffRequested ||
        decision.leadReady ||
        decision.nextStep ===
          "WAITING_FOR_AGENT";

      if (handoffRequested) {
        nextStatus =
          "WAITING_FOR_AGENT";

        nextCurrentStep =
          "WAITING_FOR_AGENT";

        nextBotActive = false;
        shouldNotifyAgents = true;
        notificationType =
          "HANDOFF_REQUESTED";
      } else if (
        decision.closeConversation
      ) {
        nextStatus = "CLOSED";
        nextBotActive = false;
      } else {
        nextStatus = "BOT_ACTIVE";
        nextBotActive = true;
      }
    } else if (
      conversation.status === "RESOLVED"
    ) {
      nextStatus =
        "WAITING_FOR_AGENT";

      nextBotActive = false;
      shouldNotifyAgents = true;
    } else if (
      conversation.status ===
        "WAITING_FOR_AGENT" ||
      conversation.status ===
        "AGENT_ACTIVE"
    ) {
      shouldNotifyAgents = true;
    } else if (
      conversation.status ===
        "BOT_ACTIVE" &&
      !company.botEnabled
    ) {
      nextStatus =
        "WAITING_FOR_AGENT";

      nextBotActive = false;
      shouldNotifyAgents = true;
      notificationType =
        "HANDOFF_REQUESTED";
    }

    const contextPhone =
      nextContext.phone?.trim() || null;

    const contextEmail =
      nextContext.email?.trim() || null;

    const contextName =
      nextContext.name?.trim() || null;

    const contextCountry =
      nextContext.country?.trim() || null;

    const contextProgrammeName =
      nextContext.programmeName?.trim() ||
      null;

    const contextProgrammeId =
      nextContext.programmeId?.trim() ||
      null;

    const notificationUsers =
      shouldNotifyAgents
        ? await prisma.user.findMany({
            where: {
              companyId: company.id,
              isActive: true,
              role: {
                in: [
                  "AGENT",
                  "COMPANY_ADMIN",
                ],
              },
            },
            select: {
              id: true,
            },
          })
        : [];

    const transactionResult =
      await prisma.$transaction(
        async (tx) => {
          const customerMessage =
            await tx.message.create({
              data: {
                companyId: company.id,
                conversationId:
                  conversation.id,
                clientMessageId,
                direction: "INBOUND",
                sender: "CUSTOMER",
                type: "TEXT",
                content: message,
                status: "RECEIVED",
              },
              select: {
                id: true,
                clientMessageId: true,
                sender: true,
                senderUserId: true,
                type: true,
                content: true,
                mediaUrl: true,
                status: true,
                createdAt: true,
              },
            });

          let leadId =
            conversation.leadId;

          if (
            decision?.leadReady &&
            contextPhone
          ) {
            const lead =
              await tx.lead.upsert({
                where: {
                  companyId_phone: {
                    companyId:
                      company.id,
                    phone: contextPhone,
                  },
                },
                update: {
                  name:
                    contextName ??
                    undefined,

                  email:
                    contextEmail ??
                    undefined,

                  country:
                    contextCountry ??
                    undefined,

                  preferredLanguage:
                    nextLanguage,

                  courseInterested:
                    contextProgrammeName ??
                    undefined,

                  programmeId:
                    contextProgrammeId ??
                    undefined,

                  status: "NEW",

                  consentAt:
                    nextContext.consent
                      ? now
                      : undefined,
                },
                create: {
                  companyId:
                    company.id,

                  phone: contextPhone,

                  name: contextName,

                  email: contextEmail,

                  country:
                    contextCountry,

                  preferredLanguage:
                    nextLanguage,

                  courseInterested:
                    contextProgrammeName,

                  programmeId:
                    contextProgrammeId,

                  source:
                    "Website Chat",

                  status: "NEW",

                  priority: "MEDIUM",

                  consentAt:
                    nextContext.consent
                      ? now
                      : null,
                },
                select: {
                  id: true,
                },
              });

            leadId = lead.id;
          }

          if (
            decision
              ?.whatsappHandoffRequested &&
            leadId
          ) {
            await tx.lead.update({
              where: {
                id: leadId,
              },
              data: {
                whatsappHandoffAt:
                  now,
              },
            });
          }

          const updatedConversation =
            await tx.conversation.update({
              where: {
                id: conversation.id,
              },
              data: {
                leadId,

                customerName:
                  contextName ??
                  conversation.customerName,

                customerEmail:
                  contextEmail ??
                  conversation.customerEmail,

                customerPhone:
                  contextPhone ??
                  conversation.customerPhone,

                language:
                  nextLanguage,

                status:
                  nextStatus,

                currentStep:
                  nextCurrentStep,

                botActive:
                  nextBotActive,

                contextData:
                  JSON.parse(
                    JSON.stringify(
                      nextContext
                    )
                  ),

                lastMessageAt: now,

                handoffRequestedAt:
                  nextStatus ===
                  "WAITING_FOR_AGENT"
                    ? conversation
                        .handoffRequestedAt ??
                      now
                    : undefined,

                resolvedAt:
                  conversation.status ===
                  "RESOLVED"
                    ? null
                    : undefined,

                closedAt:
                  nextStatus === "CLOSED"
                    ? now
                    : undefined,
              },
              select: {
                id: true,
                status: true,
                currentStep: true,
                botActive: true,
                language: true,
                leadId: true,
                customerName: true,
                customerPhone: true,
                customerEmail: true,
                lastMessageAt: true,
              },
            });

          const botMessages = [];

          if (
            decision &&
            decision.replies.length > 0
          ) {
            for (
              const reply of
              decision.replies
            ) {
              const botMessage =
                await tx.message.create({
                  data: {
                    companyId:
                      company.id,

                    conversationId:
                      conversation.id,

                    direction:
                      "OUTBOUND",

                    sender: "BOT",
                    type: "TEXT",
                    content: reply,
                    status: "SENT",
                  },
                  select: {
                    id: true,
                    clientMessageId: true,
                    sender: true,
                    senderUserId: true,
                    type: true,
                    content: true,
                    mediaUrl: true,
                    status: true,
                    createdAt: true,
                  },
                });

              botMessages.push(
                botMessage
              );
            }
          }

          if (
            shouldNotifyAgents &&
            notificationUsers.length > 0
          ) {
            await tx.notification.createMany({
              data:
                notificationUsers.map(
                  (user) => ({
                    companyId:
                      company.id,

                    userId: user.id,

                    conversationId:
                      conversation.id,

                    type:
                      notificationType,

                    title:
                      notificationType ===
                      "HANDOFF_REQUESTED"
                        ? "New human support request"
                        : "New customer message",

                    body:
                      contextName
                        ? `${contextName}: ${message.slice(
                            0,
                            150
                          )}`
                        : message.slice(
                            0,
                            150
                          ),
                  })
                ),
            });
          }

          await tx.websiteVisitor.update({
            where: {
              id: visitor.id,
            },
            data: {
              lastSeenAt: now,
            },
          });

          return {
            customerMessage,
            botMessages,
            updatedConversation,
          };
        }
      );

    const messages =
      await getConversationMessages({
        companyId: company.id,
        conversationId:
          conversation.id,
      });

    return NextResponse.json(
      {
        success: true,
        duplicate: false,

        data: {
          customerMessage:
            transactionResult.customerMessage,

          botMessages:
            transactionResult.botMessages,

          conversation:
            transactionResult.updatedConversation,

          messages,

          actions: {
            handoffRequested:
              decision?.handoffRequested ??
              false,

            whatsappHandoffRequested:
              decision
                ?.whatsappHandoffRequested ??
              false,

            whatsappHandoffNumber:
              decision
                ?.whatsappHandoffRequested
                ? company.widgetSettings
                    ?.whatsappHandoffNumber ??
                  null
                : null,
          },
        },
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          message:
            "This message was already processed.",
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    console.error(
      "Widget messages POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Your message could not be sent.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}