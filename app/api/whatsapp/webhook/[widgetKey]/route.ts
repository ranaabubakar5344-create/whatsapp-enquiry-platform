import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { decryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { processWhatsAppWebhook } from "@/lib/whatsapp/processWebhook";

type WebhookRouteProps = {
  params: Promise<{
    widgetKey: string;
  }>;
};

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const receivedSignature = signatureHeader.slice(7);

  if (!/^[a-f0-9]{64}$/i.test(receivedSignature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const receivedBuffer = Buffer.from(
    receivedSignature,
    "hex"
  );

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "hex"
  );

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

export async function GET(
  request: NextRequest,
  { params }: WebhookRouteProps
) {
  const { widgetKey } = await params;

  const mode =
    request.nextUrl.searchParams.get("hub.mode");

  const verifyToken =
    request.nextUrl.searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    request.nextUrl.searchParams.get(
      "hub.challenge"
    );

  if (
    mode !== "subscribe" ||
    !verifyToken ||
    !challenge
  ) {
    return NextResponse.json(
      {
        error: "Invalid webhook verification request.",
      },
      {
        status: 400,
      }
    );
  }

  const company = await prisma.company.findUnique({
    where: {
      widgetKey,
    },
    select: {
      id: true,
      whatsappVerifyTokenHash: true,
    },
  });

  if (!company?.whatsappVerifyTokenHash) {
    return NextResponse.json(
      {
        error: "Company or verify token was not found.",
      },
      {
        status: 404,
      }
    );
  }

  const tokenMatches = await bcrypt.compare(
    verifyToken,
    company.whatsappVerifyTokenHash
  );

  if (!tokenMatches) {
    return NextResponse.json(
      {
        error: "Webhook verify token is invalid.",
      },
      {
        status: 403,
      }
    );
  }

  await prisma.company.update({
    where: {
      id: company.id,
    },
    data: {
      whatsappWebhookVerifiedAt: new Date(),
    },
  });

  return new NextResponse(challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: WebhookRouteProps
) {
  const { widgetKey } = await params;

  const company = await prisma.company.findUnique({
    where: {
      widgetKey,
    },
    select: {
      id: true,
      whatsappPhoneNumberId: true,
      whatsappAppSecretEncrypted: true,
      botEnabled: true,
    },
  });

  if (!company?.whatsappAppSecretEncrypted) {
    return NextResponse.json(
      {
        error: "Company or App Secret was not found.",
      },
      {
        status: 404,
      }
    );
  }

  const rawBody = await request.text();

  const signatureHeader = request.headers.get(
    "x-hub-signature-256"
  );

  try {
    const appSecret = decryptSecret(
      company.whatsappAppSecretEncrypted
    );

    const signatureIsValid = verifyMetaSignature(
      rawBody,
      signatureHeader,
      appSecret
    );

    if (!signatureIsValid) {
      return NextResponse.json(
        {
          error: "Invalid webhook signature.",
        },
        {
          status: 401,
        }
      );
    }

    const payload: unknown = JSON.parse(rawBody);

    const processingResult =
      await processWhatsAppWebhook(payload, {
        id: company.id,
        whatsappPhoneNumberId:
          company.whatsappPhoneNumberId,
        botEnabled: company.botEnabled,
      });

    console.log(
      "WhatsApp webhook processed successfully:",
      processingResult
    );

    return NextResponse.json(
      {
        received: true,
        processed: processingResult,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "WhatsApp webhook processing error:",
      error
    );

    return NextResponse.json(
      {
        error: "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}