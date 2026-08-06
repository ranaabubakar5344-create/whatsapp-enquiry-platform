import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  MessageCircle,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import WhatsAppSettingsForm from "./WhatsAppSettingsForm";

export default async function WhatsAppSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-bold text-amber-900">
            Company not assigned
          </h1>

          <p className="mt-2 text-sm text-amber-700">
            This account is not connected to a company.
          </p>
        </div>
      </main>
    );
  }

  const canManageSettings =
    session.user.role === "COMPANY_ADMIN" ||
    session.user.role === "SUPER_ADMIN";

  if (!canManageSettings) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">
            Access denied
          </h1>

          <p className="mt-2 text-sm text-red-700">
            Only company administrators can manage WhatsApp settings.
          </p>
        </div>
      </main>
    );
  }

  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      name: true,
      whatsappNumber: true,
      whatsappPhoneNumberId: true,
      whatsappBusinessAccountId: true,
      whatsappAccessTokenEncrypted: true,
      whatsappAppSecretEncrypted: true,
      whatsappVerifyTokenHash: true,
      whatsappConfiguredAt: true,
      whatsappWebhookVerifiedAt: true,
    },
  });

  if (!company) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-bold text-red-900">
            Company not found
          </h1>
        </div>
      </main>
    );
  }

  const hasAccessToken = Boolean(
    company.whatsappAccessTokenEncrypted
  );

  const hasAppSecret = Boolean(
    company.whatsappAppSecretEncrypted
  );

  const hasVerifyToken = Boolean(
    company.whatsappVerifyTokenHash
  );

  const isConfigured = Boolean(
    company.whatsappNumber &&
      company.whatsappPhoneNumberId &&
      company.whatsappBusinessAccountId &&
      hasAccessToken &&
      hasAppSecret &&
      hasVerifyToken
  );

  const isWebhookVerified = Boolean(
    company.whatsappWebhookVerifiedAt
  );

  return (
    <main className="px-5 py-8 sm:px-8">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Platform Configuration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            WhatsApp Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Connect {company.name} with the Meta WhatsApp Cloud API.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-3 rounded-2xl border px-5 py-4 ${
            isConfigured
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <CircleAlert className="h-5 w-5 text-amber-600" />
          )}

          <div>
            <p
              className={`text-sm font-bold ${
                isConfigured
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {isConfigured
                ? "WhatsApp configured"
                : "Setup incomplete"}
            </p>

            <p
              className={`mt-1 text-xs ${
                isConfigured
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {isConfigured
                ? "Credentials have been securely saved."
                : "Complete all required fields below."}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            WhatsApp Number
          </p>

          <p className="mt-2 font-bold text-slate-950">
            {company.whatsappNumber ?? "Not configured"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Credentials
          </p>

          <p className="mt-2 font-bold text-slate-950">
            {hasAccessToken && hasAppSecret
              ? "Securely saved"
              : "Not configured"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Webhook className="h-5 w-5" />
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Webhook Status
          </p>

          <p
            className={`mt-2 font-bold ${
              isWebhookVerified
                ? "text-emerald-700"
                : "text-slate-950"
            }`}
          >
            {isWebhookVerified
              ? "Verified"
              : "Not verified"}
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <h2 className="text-xl font-bold text-slate-950">
            Meta WhatsApp credentials
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the details from your Meta Developer and WhatsApp
            Business account.
          </p>
        </div>

        <WhatsAppSettingsForm
          currentSettings={{
            whatsappNumber: company.whatsappNumber ?? "",
            whatsappPhoneNumberId:
              company.whatsappPhoneNumberId ?? "",
            whatsappBusinessAccountId:
              company.whatsappBusinessAccountId ?? "",
            hasAccessToken,
            hasAppSecret,
            hasVerifyToken,
          }}
        />
      </section>

      {company.whatsappConfiguredAt ? (
        <p className="mt-5 text-xs text-slate-500">
          Last configured:{" "}
          {company.whatsappConfiguredAt.toLocaleString("en-GB")}
        </p>
      ) : null}
    </main>
  );
}