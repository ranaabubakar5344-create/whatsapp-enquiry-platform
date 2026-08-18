import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Script from "next/script";

import {
  Bot,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Save,
  Settings2,
  Smartphone,
} from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type WebsiteWidgetPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    domain?: string;
    domainError?: string;
  }>;
};

function getCheckbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function isValidHostname(hostname: string) {
  if (hostname === "localhost") {
    return true;
  }

  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

  if (ipv4.test(hostname)) {
    return hostname.split(".").every((part) => {
      const number = Number(part);

      return (
        Number.isInteger(number) &&
        number >= 0 &&
        number <= 255
      );
    });
  }

  if (hostname.length > 253 || !hostname.includes(".")) {
    return false;
  }

  return hostname.split(".").every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
  );
}

function normalizeDomainInput(value: string): string | null {
  const raw = value.trim().toLowerCase();

  if (!raw || raw.includes("*")) {
    return null;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    );

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.username || url.password) {
      return null;
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

    if (!isValidHostname(hostname)) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

function inlineScriptValue(value: string) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

async function addAllowedDomain(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    redirect("/dashboard/widget?domainError=company");
  }

  const domain = normalizeDomainInput(
    String(formData.get("domain") ?? "")
  );

  if (!domain) {
    redirect("/dashboard/widget?domainError=invalid");
  }

  try {
    await prisma.widgetDomain.upsert({
      where: {
        companyId_domain: {
          companyId,
          domain,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        companyId,
        domain,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Add widget domain error:", error);
    redirect("/dashboard/widget?domainError=save");
  }

  revalidatePath("/dashboard/widget");
  redirect("/dashboard/widget?domain=added");
}

async function removeAllowedDomain(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    redirect("/dashboard/widget?domainError=company");
  }

  const domainId = String(formData.get("domainId") ?? "").trim();

  if (!domainId) {
    redirect("/dashboard/widget?domainError=invalid");
  }

  try {
    await prisma.widgetDomain.updateMany({
      where: {
        id: domainId,
        companyId,
      },
      data: {
        isActive: false,
      },
    });
  } catch (error) {
    console.error("Remove widget domain error:", error);
    redirect("/dashboard/widget?domainError=save");
  }

  revalidatePath("/dashboard/widget");
  redirect("/dashboard/widget?domain=removed");
}

async function saveWidgetSettings(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    redirect("/dashboard/widget?error=company");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const launcherText = String(formData.get("launcherText") ?? "").trim();
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim();
  const primaryColor = String(
    formData.get("primaryColor") ?? "#25D366"
  ).trim();
  const whatsappHandoffNumber = String(
    formData.get("whatsappHandoffNumber") ?? ""
  ).trim();

  const requestedPosition = String(
    formData.get("position") ?? "BOTTOM_RIGHT"
  );

  const position: "BOTTOM_RIGHT" | "BOTTOM_LEFT" =
    requestedPosition === "BOTTOM_LEFT" ? "BOTTOM_LEFT" : "BOTTOM_RIGHT";

  const requestedLanguage = String(
    formData.get("defaultLanguage") ?? "en"
  );

  const defaultLanguage = requestedLanguage === "ar" ? "ar" : "en";

  const botEnabled = getCheckbox(formData, "botEnabled");
  const isActive = getCheckbox(formData, "isActive");
  const enableArabic = getCheckbox(formData, "enableArabic");
  const collectName = getCheckbox(formData, "collectName");
  const collectPhone = getCheckbox(formData, "collectPhone");
  const collectEmail = getCheckbox(formData, "collectEmail");
  const requireConsent = getCheckbox(formData, "requireConsent");
  const humanHandoffEnabled = getCheckbox(
    formData,
    "humanHandoffEnabled"
  );
  const whatsappHandoffEnabled = getCheckbox(
    formData,
    "whatsappHandoffEnabled"
  );
  const enableSound = getCheckbox(formData, "enableSound");

  if (!launcherText || !welcomeMessage) {
    redirect("/dashboard/widget?error=required");
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
    redirect("/dashboard/widget?error=color");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: {
          id: companyId,
        },
        data: {
          botEnabled,
        },
      });

      await tx.widgetSettings.upsert({
        where: {
          companyId,
        },
        update: {
          displayName: displayName || null,
          subtitle: subtitle || null,
          launcherText,
          welcomeMessage,
          primaryColor,
          position,
          defaultLanguage,
          enableArabic,
          collectName,
          collectPhone,
          collectEmail,
          requireConsent,
          humanHandoffEnabled,
          whatsappHandoffEnabled,
          whatsappHandoffNumber: whatsappHandoffNumber || null,
          enableSound,
          isActive,
        },
        create: {
          companyId,
          displayName: displayName || null,
          subtitle: subtitle || null,
          launcherText,
          welcomeMessage,
          primaryColor,
          position,
          defaultLanguage,
          enableArabic,
          collectName,
          collectPhone,
          collectEmail,
          requireConsent,
          humanHandoffEnabled,
          whatsappHandoffEnabled,
          whatsappHandoffNumber: whatsappHandoffNumber || null,
          enableSound,
          isActive,
        },
      });
    });
  } catch (error) {
    console.error("Save widget settings error:", error);
    redirect("/dashboard/widget?error=save");
  }

  revalidatePath("/dashboard/widget");
  redirect("/dashboard/widget?saved=1");
}

export default async function WebsiteWidgetPage({
  searchParams,
}: WebsiteWidgetPageProps) {
  const params = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
          This account is not assigned to a company.
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
      widgetKey: true,
      botEnabled: true,
      primaryColor: true,
      widgetSettings: {
        select: {
          displayName: true,
          subtitle: true,
          launcherText: true,
          welcomeMessage: true,
          primaryColor: true,
          position: true,
          defaultLanguage: true,
          enableArabic: true,
          collectName: true,
          collectPhone: true,
          collectEmail: true,
          requireConsent: true,
          humanHandoffEnabled: true,
          whatsappHandoffEnabled: true,
          whatsappHandoffNumber: true,
          enableSound: true,
          isActive: true,
        },
      },
      widgetDomains: {
        where: {
          isActive: true,
        },
        orderBy: {
          domain: "asc",
        },
        select: {
          id: true,
          domain: true,
          isActive: true,
        },
      },
    },
  });

  if (!company) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Company not found.
        </div>
      </main>
    );
  }

  const requestHeaders = await headers();

  const forwardedHost = requestHeaders
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  const host =
    forwardedHost || requestHeaders.get("host") || "localhost:3000";

  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const protocol =
    forwardedProtocol ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  const appUrl = `${protocol}://${host}`.replace(/\/+$/, "");

  const settings = company.widgetSettings;

  const displayName = settings?.displayName ?? company.name;
  const subtitle = settings?.subtitle ?? "Admissions & Enquiry Support";
  const launcherText = settings?.launcherText ?? "Chat with us";
  const welcomeMessage =
    settings?.welcomeMessage ?? "Hello! How can we help you today?";
  const primaryColor =
    settings?.primaryColor ?? company.primaryColor ?? "#25D366";
  const isActive = settings?.isActive ?? true;
  const enableArabic = settings?.enableArabic ?? false;
  const collectName = settings?.collectName ?? true;
  const collectPhone = settings?.collectPhone ?? true;
  const collectEmail = settings?.collectEmail ?? true;
  const requireConsent = settings?.requireConsent ?? true;
  const humanHandoffEnabled = settings?.humanHandoffEnabled ?? true;
  const whatsappHandoffEnabled = settings?.whatsappHandoffEnabled ?? true;
  const enableSound = settings?.enableSound ?? true;

  const embedPrimaryColor = /^#[0-9a-f]{6}$/i.test(primaryColor)
    ? primaryColor
    : "#25D366";

  const embedLauncherText = launcherText.trim() || "Chat with us";

  const embedSide =
    settings?.position === "BOTTOM_LEFT" ? "left" : "right";

  const widgetUrl = `${appUrl}/widget/${company.widgetKey}`;

  const embedCode = `<!-- Website Enquiry Widget -->
<script>
(function () {
  if (window.__websiteEnquiryWidgetLoaded) {
    return;
  }

  window.__websiteEnquiryWidgetLoaded = true;

  var widgetUrl = ${inlineScriptValue(widgetUrl)};
  var widgetColor = "#25D366";
  var launcherText = ${inlineScriptValue(embedLauncherText)};
  var widgetSide = ${inlineScriptValue(embedSide)};

  function mountWidget() {
    if (document.getElementById("website-enquiry-widget-launcher")) {
      return;
    }

    var frame = document.createElement("iframe");

    frame.id = "website-enquiry-widget-frame";
    frame.title = "Website Enquiry Chat";
    frame.referrerPolicy = "strict-origin";
    frame.setAttribute("allow", "clipboard-write");
    frame.loading = "lazy";
    frame.style.position = "fixed";
    frame.style.bottom = "14px";
    frame.style[widgetSide] = "14px";
    frame.style.width = "min(350px, calc(100vw - 16px))";
    frame.style.height = "min(540px, calc(100vh - 84px))";
    frame.style.border = "0";
    frame.style.borderRadius = "22px";
    frame.style.background = "transparent";
    frame.style.zIndex = "2147483000";
    frame.style.display = "none";

    var launcher = document.createElement("button");

    launcher.id = "website-enquiry-widget-launcher";
    launcher.type = "button";
    launcher.textContent = launcherText;
    launcher.setAttribute("aria-label", launcherText);
    launcher.setAttribute("aria-expanded", "false");
    launcher.style.position = "fixed";
    launcher.style.bottom = "14px";
    launcher.style[widgetSide] = "14px";
    launcher.style.minHeight = "46px";
    launcher.style.maxWidth = "calc(100vw - 36px)";
    launcher.style.padding = "0 16px";
    launcher.style.border = "0";
    launcher.style.borderRadius = "999px";
    launcher.style.background = widgetColor;
    launcher.style.color = "#ffffff";
    launcher.style.fontFamily = "Arial, sans-serif";
    launcher.style.fontSize = "12px";
    launcher.style.fontWeight = "700";
    launcher.style.cursor = "pointer";
    launcher.style.boxShadow = "0 14px 40px rgba(15,23,42,0.24)";
    launcher.style.zIndex = "2147483001";
    launcher.style.display = "inline-flex";
    launcher.style.alignItems = "center";
    launcher.style.justifyContent = "center";

    var frameLoaded = false;

    launcher.addEventListener("click", function () {
      if (!frameLoaded) {
        frame.src = widgetUrl;
        frameLoaded = true;
      }

      frame.style.display = "block";
      launcher.style.display = "none";
      launcher.setAttribute("aria-expanded", "true");
    });

    window.addEventListener("message", function (event) {
      if (
        !event.data ||
        event.data.type !== "website-enquiry-widget-close"
      ) {
        return;
      }

      if (
        frame.contentWindow &&
        event.source !== frame.contentWindow
      ) {
        return;
      }

      frame.style.display = "none";
      launcher.style.display = "inline-flex";
      launcher.setAttribute("aria-label", launcherText);
      launcher.setAttribute("aria-expanded", "false");
    });

    document.body.appendChild(frame);
    document.body.appendChild(launcher);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountWidget, { once: true });
  } else {
    mountWidget();
  }
})();
</script>`;

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              WhatsApp CRM
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Website Widget
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              Edit your website chatbot settings, manage allowed domains and
              copy the website embed code.
            </p>
          </div>

          <a
            href={`/widget/${company.widgetKey}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <MessageCircle className="h-4 w-4" />
            Test Widget
          </a>
        </div>

        {params.saved === "1" && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            Widget settings saved successfully.
          </div>
        )}

        {params.error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {params.error === "required"
              ? "Launcher text and welcome message are required."
              : params.error === "color"
                ? "Please enter a valid HEX color."
                : "Widget settings could not be saved."}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="Widget Status"
            value={isActive ? "Active" : "Inactive"}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />

          <StatusCard
            title="Bot"
            value={company.botEnabled ? "Enabled" : "Disabled"}
            icon={<Bot className="h-5 w-5" />}
          />

          <StatusCard
            title="Language"
            value={enableArabic ? "English + Arabic" : "English"}
            icon={<Globe2 className="h-5 w-5" />}
          />

          <StatusCard
            title="Position"
            value={
              settings?.position === "BOTTOM_LEFT"
                ? "Bottom Left"
                : "Bottom Right"
            }
            icon={<Smartphone className="h-5 w-5" />}
          />
        </div>

        <form
          action={saveWidgetSettings}
          className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Settings2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Edit Widget Settings
                  </h2>
                  <p className="text-sm text-slate-500">
                    Changes are saved directly to the existing widget settings
                    record.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Display Name"
                  name="displayName"
                  defaultValue={displayName}
                />

                <Field
                  label="Subtitle"
                  name="subtitle"
                  defaultValue={subtitle}
                />

                <Field
                  label="Launcher Text"
                  name="launcherText"
                  defaultValue={launcherText}
                  required
                />

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Primary Color
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      defaultValue={primaryColor}
                      className="h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                    />

                    <div className="flex h-11 flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                      <span className="text-sm font-semibold text-slate-600">
                        Current: {primaryColor}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Widget Position
                  </label>

                  <select
                    name="position"
                    defaultValue={settings?.position ?? "BOTTOM_RIGHT"}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800"
                  >
                    <option value="BOTTOM_RIGHT">Bottom Right</option>
                    <option value="BOTTOM_LEFT">Bottom Left</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Default Language
                  </label>

                  <select
                    name="defaultLanguage"
                    defaultValue={settings?.defaultLanguage ?? "en"}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>

                <Field
                  label="WhatsApp Handoff Number"
                  name="whatsappHandoffNumber"
                  defaultValue={settings?.whatsappHandoffNumber ?? ""}
                  placeholder="+971..."
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Welcome Message
                </label>

                <textarea
                  name="welcomeMessage"
                  defaultValue={welcomeMessage}
                  required
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-emerald-400"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-lg font-bold text-slate-950">Behaviour</h2>
              <p className="mt-2 text-sm text-slate-500">
                Enable or disable the chatbot features.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Toggle
                  name="isActive"
                  label="Widget Active"
                  description="Allow visitors to use the website chatbot."
                  defaultChecked={isActive}
                />

                <Toggle
                  name="botEnabled"
                  label="Bot Enabled"
                  description="Allow the chatbot to answer automatically."
                  defaultChecked={company.botEnabled}
                />

                <Toggle
                  name="enableArabic"
                  label="Enable Arabic"
                  description="Allow Arabic language support."
                  defaultChecked={enableArabic}
                />

                <Toggle
                  name="collectName"
                  label="Collect Name"
                  description="Ask the visitor for their name."
                  defaultChecked={collectName}
                />

                <Toggle
                  name="collectPhone"
                  label="Collect Phone"
                  description="Ask for the visitor phone number."
                  defaultChecked={collectPhone}
                />

                <Toggle
                  name="collectEmail"
                  label="Collect Email"
                  description="Ask for the visitor email address."
                  defaultChecked={collectEmail}
                />

                <Toggle
                  name="requireConsent"
                  label="Require Consent"
                  description="Ask permission before collecting details."
                  defaultChecked={requireConsent}
                />

                <Toggle
                  name="humanHandoffEnabled"
                  label="Marketing Executive Handoff"
                  description="Transfer enquiries to the CRM team."
                  defaultChecked={humanHandoffEnabled}
                />

                <Toggle
                  name="whatsappHandoffEnabled"
                  label="WhatsApp Handoff"
                  description="Allow Continue on WhatsApp."
                  defaultChecked={whatsappHandoffEnabled}
                />

                <Toggle
                  name="enableSound"
                  label="Widget Sound"
                  description="Enable widget notification sound."
                  defaultChecked={enableSound}
                />
              </div>
            </section>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Widget Information
              </h2>

              <div className="mt-6">
                <CodeField label="Widget Key" value={company.widgetKey} />
              </div>

              <div className="mt-5">
                <CodeField label="Widget URL" value={widgetUrl} />
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-bold text-emerald-900">Current Setup</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Saving this form updates the existing Company and WidgetSettings
                records. Allowed domains are managed separately below.
              </p>
            </section>
          </div>
        </form>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-950">
              Allowed Domains
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add each website hostname that is allowed to load this widget. If
              a site uses both www and non-www versions, add both.
            </p>

            {params.domain === "added" && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Domain added successfully.
              </div>
            )}

            {params.domain === "removed" && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Domain removed successfully.
              </div>
            )}

            {params.domainError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {params.domainError === "invalid"
                  ? "Enter a valid domain, for example uca.feuc.ae."
                  : params.domainError === "company"
                    ? "This account is not assigned to a company."
                    : "Domain could not be saved."}
              </div>
            )}

            <form
              action={addAllowedDomain}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                name="domain"
                required
                placeholder="example.com"
                className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400"
              />

              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Add Domain
              </button>
            </form>

            <div className="mt-5 space-y-2">
              {company.widgetDomains.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No production domain is allowed yet.
                </div>
              ) : (
                company.widgetDomains.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <code className="break-all text-sm font-semibold text-slate-700">
                        {item.domain}
                      </code>
                      <p className="mt-1 text-xs font-semibold text-emerald-600">
                        Active
                      </p>
                    </div>

                    <form action={removeAllowedDomain}>
                      <input
                        type="hidden"
                        name="domainId"
                        value={item.id}
                      />

                      <button
                        type="submit"
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-950">Embed Code</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add the website to Allowed Domains first. Then paste this code
              before the closing &lt;/body&gt; tag of that website.
            </p>

            <textarea
              id="widget-embed-code"
              readOnly
              value={embedCode}
              rows={18}
              className="mt-5 w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-300 outline-none"
            />

            <button
              type="button"
              data-copy-widget-code
              className="mt-3 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Copy Embed Code
            </button>
          </section>
        </div>

        <Script id="widget-copy-code-handler" strategy="afterInteractive">
          {`
            if (!window.__widgetCopyHandler) {
              window.__widgetCopyHandler = true;

              document.addEventListener("click", async function (event) {
                var target = event.target;

                if (!(target instanceof Element)) {
                  return;
                }

                var button = target.closest("[data-copy-widget-code]");

                if (!button) {
                  return;
                }

                var field = document.getElementById("widget-embed-code");

                if (!(field instanceof HTMLTextAreaElement)) {
                  return;
                }

                try {
                  await navigator.clipboard.writeText(field.value);
                  button.textContent = "Copied!";

                  window.setTimeout(function () {
                    button.textContent = "Copy Embed Code";
                  }, 1600);
                } catch {
                  field.focus();
                  field.select();
                }
              });
            }
          `}
        </Script>
      </div>
    </main>
  );
}

function StatusCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>

      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400"
      />
    </div>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-emerald-600"
      />

      <span>
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function CodeField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <div className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4">
        <code className="whitespace-nowrap text-xs text-emerald-300">
          {value}
        </code>
      </div>
    </div>
  );
}