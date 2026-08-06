"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { encryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export type WhatsAppSettingsState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    whatsappNumber?: string[];
    whatsappPhoneNumberId?: string[];
    whatsappBusinessAccountId?: string[];
    accessToken?: string[];
    appSecret?: string[];
    verifyToken?: string[];
  };
};

const settingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .min(7, "WhatsApp number is required.")
    .max(25, "WhatsApp number is too long."),

  whatsappPhoneNumberId: z
    .string()
    .trim()
    .regex(/^\d+$/, "Phone Number ID must contain digits only."),

  whatsappBusinessAccountId: z
    .string()
    .trim()
    .regex(
      /^\d+$/,
      "WhatsApp Business Account ID must contain digits only."
    ),

  accessToken: z.string().trim(),

  appSecret: z.string().trim(),

  verifyToken: z.string().trim(),
});

export async function updateWhatsAppSettings(
  _previousState: WhatsAppSettingsState,
  formData: FormData
): Promise<WhatsAppSettingsState> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !== "COMPANY_ADMIN" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    return {
      status: "error",
      message:
        "You do not have permission to change WhatsApp settings.",
    };
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return {
      status: "error",
      message: "This account is not assigned to a company.",
    };
  }

  const parsed = settingsSchema.safeParse({
    whatsappNumber: String(
      formData.get("whatsappNumber") ?? ""
    ),
    whatsappPhoneNumberId: String(
      formData.get("whatsappPhoneNumberId") ?? ""
    ),
    whatsappBusinessAccountId: String(
      formData.get("whatsappBusinessAccountId") ?? ""
    ),
    accessToken: String(formData.get("accessToken") ?? ""),
    appSecret: String(formData.get("appSecret") ?? ""),
    verifyToken: String(formData.get("verifyToken") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  const normalizedNumber = data.whatsappNumber.replace(
    /[\s()-]/g,
    ""
  );

  if (!/^\+?\d+$/.test(normalizedNumber)) {
    return {
      status: "error",
      message: "Please enter a valid WhatsApp number.",
      fieldErrors: {
        whatsappNumber: [
          "Use country code, for example +971501234567.",
        ],
      },
    };
  }

  try {
    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        whatsappAccessTokenEncrypted: true,
        whatsappAppSecretEncrypted: true,
        whatsappVerifyTokenHash: true,
      },
    });

    if (!company) {
      return {
        status: "error",
        message: "Company was not found.",
      };
    }

    const duplicatePhoneNumberId =
      await prisma.company.findFirst({
        where: {
          whatsappPhoneNumberId: data.whatsappPhoneNumberId,
          id: {
            not: companyId,
          },
        },
        select: {
          id: true,
        },
      });

    if (duplicatePhoneNumberId) {
      return {
        status: "error",
        message:
          "This WhatsApp Phone Number ID is already connected to another company.",
        fieldErrors: {
          whatsappPhoneNumberId: [
            "Phone Number ID is already in use.",
          ],
        },
      };
    }

    const hasAccessToken =
      data.accessToken.length > 0 ||
      Boolean(company.whatsappAccessTokenEncrypted);

    const hasAppSecret =
      data.appSecret.length > 0 ||
      Boolean(company.whatsappAppSecretEncrypted);

    const hasVerifyToken =
      data.verifyToken.length > 0 ||
      Boolean(company.whatsappVerifyTokenHash);

    if (!hasAccessToken || !hasAppSecret || !hasVerifyToken) {
      return {
        status: "error",
        message:
          "Access Token, App Secret and Verify Token are required for the first setup.",
      };
    }

    const accessTokenEncrypted = data.accessToken
      ? encryptSecret(data.accessToken)
      : undefined;

    const appSecretEncrypted = data.appSecret
      ? encryptSecret(data.appSecret)
      : undefined;

    const verifyTokenHash = data.verifyToken
      ? await bcrypt.hash(data.verifyToken, 12)
      : undefined;

    await prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        whatsappNumber: normalizedNumber,
        whatsappPhoneNumberId:
          data.whatsappPhoneNumberId,
        whatsappBusinessAccountId:
          data.whatsappBusinessAccountId,

        ...(accessTokenEncrypted
          ? { whatsappAccessTokenEncrypted: accessTokenEncrypted }
          : {}),

        ...(appSecretEncrypted
          ? { whatsappAppSecretEncrypted: appSecretEncrypted }
          : {}),

        ...(verifyTokenHash
          ? { whatsappVerifyTokenHash: verifyTokenHash }
          : {}),

        whatsappConfiguredAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");

    return {
      status: "success",
      message: "WhatsApp settings saved successfully.",
    };
  } catch (error) {
    console.error("WhatsApp settings error:", error);

    return {
      status: "error",
      message:
        "WhatsApp settings could not be saved. Please try again.",
    };
  }
}