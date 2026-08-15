"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type LeadActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const createLeadSchema = z.object({
  name: z.string().trim().max(100),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .min(7, "Please enter a valid phone number."),
  email: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || z.string().email().safeParse(value).success,
      "Please enter a valid email address."
    ),
  country: z.string().trim().max(100),
  courseInterested: z.string().trim().max(150),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const updateLeadSchema = createLeadSchema.extend({
  leadId: z.string().min(1, "Lead ID is missing."),
  status: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "FOLLOW_UP",
    "CONVERTED",
    "LOST",
  ]),
  assignedToId: z.string().trim(),
  remarks: z.string().trim().max(2000),
});

async function getAuthenticatedCompanyId() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session.user.companyId;
}

export async function createLead(
  _previousState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const companyId = await getAuthenticatedCompanyId();

  if (!companyId) {
    return {
      status: "error",
      message: "This account is not assigned to a company.",
    };
  }

  const parsed = createLeadSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    country: String(formData.get("country") ?? ""),
    courseInterested: String(
      formData.get("courseInterested") ?? ""
    ),
    priority: String(formData.get("priority") ?? "MEDIUM"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    await prisma.lead.create({
      data: {
        companyId,
        name: data.name || null,
        phone: data.phone,
        email: data.email || null,
        country: data.country || null,
        courseInterested: data.courseInterested || null,
        priority: data.priority,
        status: "NEW",
        source: "Manual Entry",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");

    return {
      status: "success",
      message: "Lead saved successfully.",
    };
  } catch (error) {
    console.error("Create lead error:", error);

    return {
      status: "error",
      message: "Lead could not be saved. Please try again.",
    };
  }
}

export async function updateLead(
  _previousState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const companyId = await getAuthenticatedCompanyId();

  if (!companyId) {
    return {
      status: "error",
      message: "This account is not assigned to a company.",
    };
  }

  const parsed = updateLeadSchema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    country: String(formData.get("country") ?? ""),
    courseInterested: String(
      formData.get("courseInterested") ?? ""
    ),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    status: String(formData.get("status") ?? "NEW"),
    assignedToId: String(formData.get("assignedToId") ?? ""),
    remarks: String(formData.get("remarks") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: data.leadId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!existingLead) {
      return {
        status: "error",
        message: "Lead was not found.",
      };
    }

    if (data.assignedToId) {
      const agent = await prisma.user.findFirst({
        where: {
          id: data.assignedToId,
          companyId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!agent) {
        return {
          status: "error",
          message: "Selected agent is not valid.",
        };
      }
    }

    await prisma.lead.update({
      where: {
        id: data.leadId,
      },
      data: {
        name: data.name || null,
        phone: data.phone,
        email: data.email || null,
        country: data.country || null,
        courseInterested: data.courseInterested || null,
        priority: data.priority,
        status: data.status,
        assignedToId: data.assignedToId || null,
        remarks: data.remarks || null,
        lastContactedAt:
          data.status === "CONTACTED" ? new Date() : undefined,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${data.leadId}`);

    return {
      status: "success",
      message: "Lead updated successfully.",
    };
  } catch (error) {
    console.error("Update lead error:", error);

    return {
      status: "error",
      message: "Lead could not be updated. Please try again.",
    };
  }
}

export async function deleteLead(formData: FormData) {
  const companyId = await getAuthenticatedCompanyId();

  if (!companyId) {
    redirect("/login");
  }

  const leadId = String(formData.get("leadId") ?? "");

  if (!leadId) {
    redirect("/dashboard/leads");
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      companyId,
    },
    select: {
      id: true,
    },
  });

  if (!lead) {
    redirect("/dashboard/leads");
  }

  await prisma.lead.delete({
    where: {
      id: lead.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");

  redirect("/dashboard/leads");
}