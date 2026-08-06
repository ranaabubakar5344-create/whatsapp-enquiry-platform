import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_LIMIT = 200;

type ChatRouteProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

type ChatActionBody = {
  action?: "join" | "send" | "resolve";
  message?: string;
};

async function getConversation(
  companyId: string,
  conversationId: string
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      companyId,
      channel: "WEBSITE",
    },
    select: {
      id: true,
      status: true,
      currentStep: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      language: true,
      lastMessageAt: true,
      handoffRequestedAt: true,
      acceptedAt: true,
      resolvedAt: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          availability: true,
        },
      },
      lead: {
        select: {
          id: true,
          courseInterested: true,
          country: true,
          source: true,
          priority: true,
        },
      },
      messages: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: MESSAGE_LIMIT,
        select: {
          id: true,
          sender: true,
          content: true,
          status: true,
          createdAt: true,
          senderUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

type DashboardConversation = NonNullable<
  Awaited<ReturnType<typeof getConversation>>
>;

function serializeConversation(
  conversation: DashboardConversation
) {
  return {
    id: conversation.id,
    status: conversation.status,
    currentStep: conversation.currentStep,
    customerName: conversation.customerName,
    customerPhone: conversation.customerPhone,
    customerEmail: conversation.customerEmail,
    language: conversation.language,
    lastMessageAt:
      conversation.lastMessageAt.toISOString(),
    handoffRequestedAt:
      conversation.handoffRequestedAt?.toISOString() ??
      null,
    acceptedAt:
      conversation.acceptedAt?.toISOString() ?? null,
    resolvedAt:
      conversation.resolvedAt?.toISOString() ?? null,
    assignedAgent: conversation.assignedTo
      ? {
          id: conversation.assignedTo.id,
          name: conversation.assignedTo.name,
          availability:
            conversation.assignedTo.availability,
        }
      : null,
    lead: conversation.lead
      ? {
          id: conversation.lead.id,
          courseInterested:
            conversation.lead.courseInterested,
          country: conversation.lead.country,
          source: conversation.lead.source,
          priority: conversation.lead.priority,
        }
      : null,
    messages: [...conversation.messages]
      .reverse()
      .map((message) => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
        senderUser: message.senderUser,
      })),
  };
}

async function getAuthenticatedUser() {
  const session = await auth();

  if (
    !session?.user?.id ||
    !session.user.companyId
  ) {
    return null;
  }

  return {
    id: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: ChatRouteProps
): Promise<Response> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { conversationId } = await params;

  const conversation = await getConversation(
    currentUser.companyId,
    conversationId
  );

  if (!conversation) {
    return NextResponse.json(
      {
        success: false,
        error: "Conversation was not found.",
      },
      {
        status: 404,
      }
    );
  }

  // Mark matching notifications as read once.
  // Do not write to Conversation on every polling request;
  // repeated database writes made the live-chat page slow and jumpy.
  await prisma.notification.updateMany({
    where: {
      companyId: currentUser.companyId,
      userId: currentUser.id,
      conversationId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        conversation:
          serializeConversation(conversation),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(
  request: NextRequest,
  { params }: ChatRouteProps
): Promise<Response> {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { conversationId } = await params;

  let body: ChatActionBody;

  try {
    body = (await request.json()) as ChatActionBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body is not valid JSON.",
      },
      {
        status: 400,
      }
    );
  }

  const currentConversation =
    await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        companyId: currentUser.companyId,
        channel: "WEBSITE",
      },
      select: {
        id: true,
        status: true,
        assignedToId: true,
        firstAgentReplyAt: true,
      },
    });

  if (!currentConversation) {
    return NextResponse.json(
      {
        success: false,
        error: "Conversation was not found.",
      },
      {
        status: 404,
      }
    );
  }

  const now = new Date();

  if (body.action === "join") {
    if (
      currentConversation.status === "AGENT_ACTIVE" &&
      currentConversation.assignedToId === currentUser.id
    ) {
      const conversation = await getConversation(
        currentUser.companyId,
        conversationId
      );

      if (!conversation) {
        return NextResponse.json(
          {
            success: false,
            error: "Conversation was not found.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          conversation:
            serializeConversation(conversation),
        },
      });
    }

    if (
      currentConversation.assignedToId &&
      currentConversation.assignedToId !== currentUser.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This chat has already been joined by another team member.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      currentConversation.status !==
      "WAITING_FOR_AGENT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This chat is no longer waiting.",
        },
        {
          status: 409,
        }
      );
    }

    const claimed =
      await prisma.conversation.updateMany({
        where: {
          id: conversationId,
          companyId: currentUser.companyId,
          status: "WAITING_FOR_AGENT",
          OR: [
            {
              assignedToId: null,
            },
            {
              assignedToId: currentUser.id,
            },
          ],
        },
        data: {
          assignedToId: currentUser.id,
          status: "AGENT_ACTIVE",
          currentStep: "AGENT_CONNECTED",
          botActive: false,
          acceptedAt: now,
          agentLastReadAt: now,
          lastMessageAt: now,
        },
      });

    if (claimed.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Another team member joined this chat first.",
        },
        {
          status: 409,
        }
      );
    }
  } else if (body.action === "send") {
    const cleanMessage =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (
      !cleanMessage ||
      cleanMessage.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a message between 1 and 2000 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      currentConversation.status !== "AGENT_ACTIVE" ||
      currentConversation.assignedToId !== currentUser.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Join this chat before sending a reply.",
        },
        {
          status: 403,
        }
      );
    }

    await prisma.$transaction([
      prisma.message.create({
        data: {
          companyId: currentUser.companyId,
          conversationId,
          direction: "OUTBOUND",
          sender: "AGENT",
          senderUserId: currentUser.id,
          type: "TEXT",
          content: cleanMessage,
          status: "SENT",
        },
      }),
      prisma.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          lastMessageAt: now,
          agentLastReadAt: now,
          firstAgentReplyAt:
            currentConversation.firstAgentReplyAt ??
            now,
        },
      }),
    ]);
  } else if (body.action === "resolve") {
    const canResolve =
      currentConversation.assignedToId ===
        currentUser.id ||
      currentUser.role === "COMPANY_ADMIN" ||
      currentUser.role === "SUPER_ADMIN";

    if (!canResolve) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the assigned team member or an administrator can resolve this chat.",
        },
        {
          status: 403,
        }
      );
    }

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        status: "RESOLVED",
        currentStep: "COMPLETED",
        botActive: false,
        resolvedAt: now,
        agentLastReadAt: now,
        lastMessageAt: now,
      },
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported chat action.",
      },
      {
        status: 400,
      }
    );
  }

  const updatedConversation = await getConversation(
    currentUser.companyId,
    conversationId
  );

  if (!updatedConversation) {
    return NextResponse.json(
      {
        success: false,
        error: "Conversation was not found.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        conversation:
          serializeConversation(updatedConversation),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}