import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const [enquiries, reminderCandidates] =
      await Promise.all([
        prisma.conversation.findMany({
          where: {
            companyId: session.user.companyId,
            channel: "WEBSITE",
            status: "WAITING_FOR_AGENT",
          },
          orderBy: {
            lastMessageAt: "desc",
          },
          take: 50,
          select: {
            id: true,
            leadId: true,
            customerName: true,
            customerPhone: true,
            status: true,
            currentStep: true,
            lastMessageAt: true,
            createdAt: true,
            lead: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        }),

        prisma.conversation.findMany({
          where: {
            companyId: session.user.companyId,
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
            updatedAt: "desc",
          },
          take: 300,
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            contextData: true,
            lead: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        }),
      ]);

    const now = Date.now();

    const reminders = reminderCandidates
      .map((conversation) => {
        const context =
          typeof conversation.contextData === "object" &&
          conversation.contextData !== null &&
          !Array.isArray(conversation.contextData)
            ? (conversation.contextData as Record<string, unknown>)
            : {};

        const followUpAt =
          typeof context.crmFollowUpAt === "string"
            ? context.crmFollowUpAt
            : null;

        const completedAt =
          typeof context.crmFollowUpCompletedAt === "string"
            ? context.crmFollowUpCompletedAt
            : null;

        if (!followUpAt || completedAt) {
          return null;
        }

        const followUpTime =
          new Date(followUpAt).getTime();

        if (
          Number.isNaN(followUpTime) ||
          followUpTime > now
        ) {
          return null;
        }

        return {
          conversationId: conversation.id,
          customerName:
            conversation.customerName ??
            conversation.lead?.name ??
            "Customer",
          customerPhone:
            conversation.customerPhone ??
            conversation.lead?.phone ??
            "Phone not available",
          followUpAt,
          note:
            typeof context.crmFollowUpNote === "string"
              ? context.crmFollowUpNote
              : null,
          createdByName:
            typeof context.crmFollowUpCreatedByName === "string"
              ? context.crmFollowUpCreatedByName
              : null,
        };
      })
      .filter(
        (
          reminder
        ): reminder is NonNullable<typeof reminder> =>
          reminder !== null
      )
      .sort(
        (a, b) =>
          new Date(a.followUpAt).getTime() -
          new Date(b.followUpAt).getTime()
      );

    return NextResponse.json(
      {
        success: true,
        data: {
          count:
            enquiries.length +
            reminders.length,
          waitingCount:
            enquiries.length,
          reminderCount:
            reminders.length,
          reminders,
          enquiries: enquiries.map(
            (enquiry) => ({
              id: enquiry.id,
              leadId: enquiry.leadId,
              customerName:
                enquiry.customerName ??
                enquiry.lead?.name ??
                "New Customer",
              customerPhone:
                enquiry.customerPhone ??
                enquiry.lead?.phone ??
                "Phone not available",
              status: enquiry.status,
              currentStep:
                enquiry.currentStep,
              lastMessageAt:
                enquiry.lastMessageAt.toISOString(),
              createdAt:
                enquiry.createdAt.toISOString(),
            })
          ),
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
  } catch (error) {
    console.error(
      "Dashboard enquiries API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Enquiries could not be loaded.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}