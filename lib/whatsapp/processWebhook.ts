import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type IncomingMessageType =
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "AUDIO"
  | "VIDEO"
  | "LOCATION"
  | "INTERACTIVE";

type StoredMessageStatus =
  | "RECEIVED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;

  text?: {
    body?: string;
  };

  button?: {
    text?: string;
    payload?: string;
  };

  interactive?: {
    type?: string;
    button_reply?: {
      id?: string;
      title?: string;
    };
    list_reply?: {
      id?: string;
      title?: string;
      description?: string;
    };
  };

  image?: {
    id?: string;
    caption?: string;
    mime_type?: string;
  };

  document?: {
    id?: string;
    caption?: string;
    filename?: string;
    mime_type?: string;
  };

  audio?: {
    id?: string;
    mime_type?: string;
  };

  video?: {
    id?: string;
    caption?: string;
    mime_type?: string;
  };

  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
  };
};

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }>;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };

        contacts?: Array<{
          wa_id?: string;
          profile?: {
            name?: string;
          };
        }>;

        messages?: MetaMessage[];
        statuses?: MetaStatus[];
      };
    }>;
  }>;
};

type CompanyConfiguration = {
  id: string;
  whatsappPhoneNumberId: string | null;
  botEnabled: boolean;
};

type ProcessingResult = {
  savedMessages: number;
  updatedStatuses: number;
  ignoredEvents: number;
};

function normalizeCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  return digits ? `+${digits}` : value.trim();
}

function getEventDate(timestamp?: string): Date {
  const seconds = Number(timestamp);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return new Date();
  }

  const date = new Date(seconds * 1000);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getMessageContent(message: MetaMessage): {
  type: IncomingMessageType;
  content: string;
} {
  switch (message.type) {
    case "text":
      return {
        type: "TEXT",
        content: message.text?.body?.trim() || "[Empty text message]",
      };

    case "button":
      return {
        type: "INTERACTIVE",
        content:
          message.button?.text?.trim() ||
          message.button?.payload?.trim() ||
          "[Button response]",
      };

    case "interactive": {
      const buttonReply = message.interactive?.button_reply;
      const listReply = message.interactive?.list_reply;

      return {
        type: "INTERACTIVE",
        content:
          buttonReply?.title?.trim() ||
          listReply?.title?.trim() ||
          listReply?.description?.trim() ||
          "[Interactive response]",
      };
    }

    case "image":
      return {
        type: "IMAGE",
        content: message.image?.caption?.trim() || "[Image]",
      };

    case "document":
      return {
        type: "DOCUMENT",
        content:
          message.document?.caption?.trim() ||
          message.document?.filename?.trim() ||
          "[Document]",
      };

    case "audio":
      return {
        type: "AUDIO",
        content: "[Audio message]",
      };

    case "video":
      return {
        type: "VIDEO",
        content: message.video?.caption?.trim() || "[Video]",
      };

    case "location": {
      const location = message.location;

      const locationText = [
        location?.name,
        location?.address,
        typeof location?.latitude === "number" &&
        typeof location?.longitude === "number"
          ? `${location.latitude}, ${location.longitude}`
          : null,
      ]
        .filter(Boolean)
        .join(" â€” ");

      return {
        type: "LOCATION",
        content: locationText || "[Location]",
      };
    }

    default:
      return {
        type: "TEXT",
        content: `[Unsupported message type: ${
          message.type || "unknown"
        }]`,
      };
  }
}

function mapMetaStatus(
  status?: string
): StoredMessageStatus | null {
  switch (status) {
    case "sent":
      return "SENT";

    case "delivered":
      return "DELIVERED";

    case "read":
      return "READ";

    case "failed":
      return "FAILED";

    default:
      return null;
  }
}

function getStatusError(status: MetaStatus): string | null {
  if (!status.errors?.length) {
    return null;
  }

  return status.errors
    .map((error) => {
      return (
        error.error_data?.details ||
        error.message ||
        error.title ||
        `Meta error ${error.code ?? "unknown"}`
      );
    })
    .join(" | ");
}

export async function processWhatsAppWebhook(
  rawPayload: unknown,
  company: CompanyConfiguration
): Promise<ProcessingResult> {
  const payload = rawPayload as MetaWebhookPayload;

  const result: ProcessingResult = {
    savedMessages: 0,
    updatedStatuses: 0,
    ignoredEvents: 0,
  };

  if (
    payload.object &&
    payload.object !== "whatsapp_business_account"
  ) {
    result.ignoredEvents += 1;
    return result;
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") {
        result.ignoredEvents += 1;
        continue;
      }

      const value = change.value;

      if (!value) {
        result.ignoredEvents += 1;
        continue;
      }

      const incomingPhoneNumberId =
        value.metadata?.phone_number_id;

      if (
        company.whatsappPhoneNumberId &&
        incomingPhoneNumberId &&
        incomingPhoneNumberId !==
          company.whatsappPhoneNumberId
      ) {
        console.warn(
          "Ignored webhook because Phone Number ID did not match the company."
        );

        result.ignoredEvents += 1;
        continue;
      }

      for (const status of value.statuses ?? []) {
        if (!status.id) {
          result.ignoredEvents += 1;
          continue;
        }

        const mappedStatus = mapMetaStatus(status.status);

        if (!mappedStatus) {
          result.ignoredEvents += 1;
          continue;
        }

        const updateResult = await prisma.message.updateMany({
          where: {
            companyId: company.id,
            whatsappMessageId: status.id,
          },
          data: {
            status: mappedStatus,
            errorMessage:
              mappedStatus === "FAILED"
                ? getStatusError(status)
                : null,
          },
        });

        result.updatedStatuses += updateResult.count;
      }

      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) {
          result.ignoredEvents += 1;
          continue;
        }

        const customerPhone = normalizeCustomerPhone(
          message.from
        );

        const matchingContact =
          value.contacts?.find((contact) => {
            return (
              normalizeCustomerPhone(contact.wa_id ?? "") ===
              customerPhone
            );
          }) ?? value.contacts?.[0];

        const customerName =
          matchingContact?.profile?.name?.trim() || null;

        const eventDate = getEventDate(message.timestamp);
        const parsedMessage = getMessageContent(message);

        await prisma.$transaction(async (transaction) => {
          const existingConversation =
            await transaction.conversation.findUnique({
              where: {
                companyId_customerPhone: {
                  companyId: company.id,
                  customerPhone,
                },
              },
              select: {
                id: true,
                leadId: true,
              },
            });

          let leadId =
            existingConversation?.leadId ?? null;

          if (leadId) {
            await transaction.lead.update({
              where: {
                id: leadId,
              },
              data: {
                ...(customerName
                  ? {
                      name: customerName,
                    }
                  : {}),
                lastContactedAt: eventDate,
              },
            });
          } else {
            const lead =
              await transaction.lead.create({
                data: {
                  companyId: company.id,
                  name: customerName,
                  phone: customerPhone,
                  source: "WhatsApp",
                  status: "NEW",
                  priority: "MEDIUM",
                  lastContactedAt: eventDate,
                },
                select: {
                  id: true,
                },
              });

            leadId = lead.id;
          }

          const conversation =
            await transaction.conversation.upsert({
              where: {
                companyId_customerPhone: {
                  companyId: company.id,
                  customerPhone,
                },
              },

              update: {
                leadId,
                ...(customerName
                  ? {
                      customerName,
                    }
                  : {}),
                lastMessageAt: eventDate,
                closedAt: null,
              },

              create: {
                companyId: company.id,
                leadId,
                customerPhone,
                customerName,
                status: company.botEnabled
                  ? "BOT_ACTIVE"
                  : "WAITING_FOR_AGENT",
                currentStep: "WELCOME",
                botActive: company.botEnabled,
                lastMessageAt: eventDate,
              },
            });

          await transaction.message.upsert({
            where: {
              whatsappMessageId: message.id,
            },

            update: {
              rawPayload:
                message as Prisma.InputJsonValue,
            },

            create: {
              companyId: company.id,
              conversationId: conversation.id,
              whatsappMessageId: message.id,
              direction: "INBOUND",
              sender: "CUSTOMER",
              type: parsedMessage.type,
              content: parsedMessage.content,
              status: "RECEIVED",
              rawPayload:
                message as Prisma.InputJsonValue,
              createdAt: eventDate,
            },
          });
        });

        result.savedMessages += 1;
      }
    }
  }

  return result;
}