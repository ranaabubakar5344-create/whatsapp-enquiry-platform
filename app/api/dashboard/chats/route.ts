import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return NextResponse.json(
      {
        success: false,
        error: "Company is not assigned.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const conversations =
      await prisma.conversation.findMany({
        where: {
          companyId,
          channel: "WEBSITE",
          status: {
            in: [
              "WAITING_FOR_AGENT",
              "AGENT_ACTIVE",
              "RESOLVED",
            ],
          },
        },

        orderBy: {
          lastMessageAt: "desc",
        },

        take: 100,

        select: {
          id: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          lastMessageAt: true,
          handoffRequestedAt: true,

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
              name: true,
              phone: true,
              email: true,
              courseInterested: true,
              country: true,
            },
          },

          messages: {
            where: {
              deletedAt: null,
            },

            orderBy: {
              createdAt: "desc",
            },

            take: 1,

            select: {
              content: true,
              sender: true,
              createdAt: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        data: {
          conversations:
            conversations.map(
              (conversation) => ({
                id: conversation.id,
                status: conversation.status,
                customerName:
                  conversation.customerName,
                customerPhone:
                  conversation.customerPhone,
                customerEmail:
                  conversation.customerEmail,
                lastMessageAt:
                  conversation.lastMessageAt.toISOString(),
                handoffRequestedAt:
                  conversation.handoffRequestedAt?.toISOString() ??
                  null,

                assignedTo:
                  conversation.assignedTo,

                lead: conversation.lead,

                latestMessage:
                  conversation.messages[0]
                    ? {
                        content:
                          conversation.messages[0]
                            .content,
                        sender:
                          conversation.messages[0]
                            .sender,
                        createdAt:
                          conversation.messages[0]
                            .createdAt.toISOString(),
                      }
                    : null,
              })
            ),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Dashboard chats list error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Live chats could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}