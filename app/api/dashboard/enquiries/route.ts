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

    const enquiries = await prisma.conversation.findMany({
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
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          count: enquiries.length,
          enquiries: enquiries.map((enquiry) => ({
            id: enquiry.id,
            leadId: enquiry.leadId,
            customerName:
              enquiry.customerName ?? "New Customer",
            customerPhone:
              enquiry.customerPhone ?? "Phone not available",
            status: enquiry.status,
            currentStep: enquiry.currentStep,
            lastMessageAt:
              enquiry.lastMessageAt.toISOString(),
            createdAt: enquiry.createdAt.toISOString(),
          })),
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
        error: "Enquiries could not be loaded.",
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