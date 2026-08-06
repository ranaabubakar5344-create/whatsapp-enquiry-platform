"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AgentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
};

const agentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Agent name must contain at least 2 characters.")
    .max(100, "Agent name is too long."),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address."),

  password: z
    .string()
    .min(10, "Password must contain at least 10 characters.")
    .max(128, "Password is too long."),
});

async function getAdminSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !== "COMPANY_ADMIN" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    return {
      error: "You do not have permission to manage agents.",
      companyId: null,
    };
  }

  if (!session.user.companyId) {
    return {
      error: "This account is not assigned to a company.",
      companyId: null,
    };
  }

  return {
    error: null,
    companyId: session.user.companyId,
  };
}

export async function createAgent(
  _previousState: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const admin = await getAdminSession();

  if (!admin.companyId) {
    return {
      status: "error",
      message: admin.error ?? "Company was not found.",
    };
  }

  const parsed = agentSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "")
      .toLowerCase()
      .trim(),
    password: String(formData.get("password") ?? ""),
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
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return {
        status: "error",
        message: "An account with this email address already exists.",
        fieldErrors: {
          email: ["This email address is already in use."],
        },
      };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
      data: {
        companyId: admin.companyId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: "AGENT",
        isActive: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/agents");

    return {
      status: "success",
      message: "Agent created successfully.",
    };
  } catch (error) {
    console.error("Create agent error:", error);

    return {
      status: "error",
      message: "Agent could not be created. Please try again.",
    };
  }
}

export async function toggleAgentStatus(formData: FormData) {
  const admin = await getAdminSession();

  if (!admin.companyId) {
    return;
  }

  const agentId = String(formData.get("agentId") ?? "");

  if (!agentId) {
    return;
  }

  const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      companyId: admin.companyId,
      role: "AGENT",
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!agent) {
    return;
  }

  await prisma.user.update({
    where: {
      id: agent.id,
    },
    data: {
      isActive: !agent.isActive,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agents");
}

export async function deleteAgent(formData: FormData) {
  const admin = await getAdminSession();

  if (!admin.companyId) {
    return;
  }

  const agentId = String(formData.get("agentId") ?? "");

  if (!agentId) {
    return;
  }

  const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      companyId: admin.companyId,
      role: "AGENT",
    },
    select: {
      id: true,
    },
  });

  if (!agent) {
    return;
  }

  await prisma.user.delete({
    where: {
      id: agent.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agents");
}