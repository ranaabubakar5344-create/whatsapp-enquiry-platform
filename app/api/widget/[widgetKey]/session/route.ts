import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createVisitorSessionToken,
  hashVisitorSessionToken,
  normalizeWidgetOrigin,
  verifyWidgetAccessToken,
} from "@/lib/widgetSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionRouteProps = {
  params: Promise<{
    widgetKey: string;
  }>;
};

type SessionRequestBody = {
  accessToken?: string;
  visitorSessionToken?: string;
  pageUrl?: string;
  referrer?: string;
  language?: string;
};

function getRequestOrigin(request: NextRequest): string | null {
  const originHeader = request.headers.get("origin");

  if (originHeader) {
    const origin = normalizeWidgetOrigin(originHeader);

    if (origin) {
      return origin;
    }
  }

  const refererHeader = request.headers.get("referer");

  if (refererHeader) {
    return normalizeWidgetOrigin(refererHeader);
  }

  return null;
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Widget-Access-Token",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, max-age=0",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
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

function normalizeLanguage(value: unknown): string {
  if (typeof value !== "string") {
    return "en";
  }

  const language = value.trim().toLowerCase();

  if (language === "ar") {
    return "ar";
  }

  return "en";
}

export async function OPTIONS(request: NextRequest) {
  const origin = getRequestOrigin(request);

  if (!origin) {
    return NextResponse.json(
      {
        success: false,
        error: "Website origin could not be identified.",
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

export async function POST(
  request: NextRequest,
  { params }: SessionRouteProps
): Promise<Response> {
  const { widgetKey } = await params;
  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    return NextResponse.json(
      {
        success: false,
        error: "Website origin could not be identified.",
      },
      {
        status: 400,
      }
    );
  }

  const corsHeaders = createCorsHeaders(requestOrigin);

  try {
    const body = (await request.json()) as SessionRequestBody;

    const accessToken =
      request.headers.get("x-widget-access-token") ??
      body.accessToken ??
      "";

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
          error: "Widget access is not authorized.",
        },
        {
          status: 403,
          headers: corsHeaders,
        }
      );
    }

    const company = await prisma.company.findFirst({
      where: {
        id: accessPayload.companyId,
        widgetKey,
        isActive: true,
      },
      select: {
        id: true,
        botEnabled: true,
        widgetSettings: {
          select: {
            isActive: true,
            defaultLanguage: true,
            welcomeMessage: true,
          },
        },
      },
    });

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

    const pageUrl = normalizeOptionalText(
      body.pageUrl,
      2000
    );

    const referrer = normalizeOptionalText(
      body.referrer,
      2000
    );

    const userAgent = normalizeOptionalText(
      request.headers.get("user-agent"),
      1000
    );

    const language = normalizeLanguage(
      body.language ??
        company.widgetSettings?.defaultLanguage
    );

    let visitorSessionToken =
      normalizeOptionalText(
        body.visitorSessionToken,
        300
      );

    let visitor = null;

    if (visitorSessionToken) {
      try {
        const tokenHash = hashVisitorSessionToken(
          visitorSessionToken
        );

        visitor = await prisma.websiteVisitor.findFirst({
          where: {
            companyId: company.id,
            sessionTokenHash: tokenHash,
          },
          select: {
            id: true,
            language: true,
            conversations: {
              where: {
                channel: "WEBSITE",
              },
              orderBy: {
                lastMessageAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                status: true,
                currentStep: true,
                botActive: true,
                lastMessageAt: true,
              },
            },
          },
        });
      } catch {
        visitor = null;
      }
    }

    let isNewSession = false;

    if (!visitor) {
      visitorSessionToken =
        createVisitorSessionToken();

      const sessionTokenHash =
        hashVisitorSessionToken(
          visitorSessionToken
        );

      const createdVisitor =
        await prisma.websiteVisitor.create({
          data: {
            companyId: company.id,
            sessionTokenHash,
            firstPageUrl: pageUrl,
            lastPageUrl: pageUrl,
            referrer,
            language,
            userAgent,
          },
          select: {
            id: true,
            language: true,
          },
        });

      const conversation =
        await prisma.conversation.create({
          data: {
            companyId: company.id,
            websiteVisitorId: createdVisitor.id,
            customerPhone: `web:${createdVisitor.id}`,
            language,
            channel: "WEBSITE",
            status: "BOT_ACTIVE",
            currentStep: "WELCOME",
            botActive: company.botEnabled,
            sourcePageUrl: pageUrl,
          },
          select: {
            id: true,
            status: true,
            currentStep: true,
            botActive: true,
            lastMessageAt: true,
          },
        });

      visitor = {
        id: createdVisitor.id,
        language: createdVisitor.language,
        conversations: [conversation],
      };

      isNewSession = true;
    } else {
      await prisma.websiteVisitor.update({
        where: {
          id: visitor.id,
        },
        data: {
          lastPageUrl: pageUrl,
          language,
          userAgent,
          lastSeenAt: new Date(),
        },
      });

      if (visitor.conversations.length === 0) {
        const conversation =
          await prisma.conversation.create({
            data: {
              companyId: company.id,
              websiteVisitorId: visitor.id,
              customerPhone: `web:${visitor.id}`,
              language,
              channel: "WEBSITE",
              status: "BOT_ACTIVE",
              currentStep: "WELCOME",
              botActive: company.botEnabled,
              sourcePageUrl: pageUrl,
            },
            select: {
              id: true,
              status: true,
              currentStep: true,
              botActive: true,
              lastMessageAt: true,
            },
          });

        visitor.conversations = [conversation];
      }
    }

    const conversation =
      visitor.conversations[0];

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Conversation could not be created.",
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    const existingMessages =
      await prisma.message.findMany({
        where: {
          companyId: company.id,
          conversationId: conversation.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 100,
        select: {
          id: true,
          sender: true,
          type: true,
          content: true,
          mediaUrl: true,
          status: true,
          createdAt: true,
        },
      });

    if (
      isNewSession &&
      existingMessages.length === 0
    ) {
      const welcomeMessage =
        company.widgetSettings?.welcomeMessage ??
        "Hello! How can we help you today?";

      const createdWelcomeMessage =
        await prisma.message.create({
          data: {
            companyId: company.id,
            conversationId: conversation.id,
            direction: "OUTBOUND",
            sender: "BOT",
            type: "TEXT",
            content: welcomeMessage,
            status: "SENT",
          },
          select: {
            id: true,
            sender: true,
            type: true,
            content: true,
            mediaUrl: true,
            status: true,
            createdAt: true,
          },
        });

      existingMessages.push(
        createdWelcomeMessage
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          isNewSession,
          visitorSessionToken,
          visitor: {
            id: visitor.id,
            language,
          },
          conversation: {
            id: conversation.id,
            status: conversation.status,
            currentStep: conversation.currentStep,
            botActive: conversation.botActive,
            lastMessageAt:
              conversation.lastMessageAt,
          },
          messages: existingMessages,
        },
      },
      {
        status: isNewSession ? 201 : 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(
      "Widget session API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Visitor session could not be created.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}