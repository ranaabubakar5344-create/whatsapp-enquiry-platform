import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Script from "next/script";

import {
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Globe2,
  Languages,
  MessageCircle,
  Palette,
  Save,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
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

  const whatsappHeader = "rgba(0, 128, 105, 1)";
  const whatsappPrimary = "rgba(0, 168, 132, 1)";
  const whatsappLauncher = "rgba(37, 211, 102, 1)";
  const whatsappOutgoing = "rgba(217, 253, 211, 1)";
  const whatsappIncoming = "rgba(255, 255, 255, 1)";
  const whatsappChatBackground = "rgba(239, 234, 226, 1)";
  const whatsappText = "rgba(17, 27, 33, 1)";
  const whatsappMuted = "rgba(102, 119, 129, 1)";

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
  var widgetColor = ${inlineScriptValue(embedPrimaryColor)};
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
    frame.style.bottom = "88px";
    frame.style[widgetSide] = "16px";
    frame.style.width = "min(440px, calc(100vw - 24px))";
    frame.style.height = "min(760px, calc(100vh - 104px))";
    frame.style.border = "0";
    frame.style.borderRadius = "28px";
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
    launcher.style.bottom = "18px";
    launcher.style[widgetSide] = "18px";
    launcher.style.minHeight = "54px";
    launcher.style.maxWidth = "calc(100vw - 36px)";
    launcher.style.padding = "0 20px";
    launcher.style.border = "0";
    launcher.style.borderRadius = "999px";
    launcher.style.background = widgetColor;
    launcher.style.color = "#ffffff";
    launcher.style.fontFamily = "Arial, sans-serif";
    launcher.style.fontSize = "14px";
    launcher.style.fontWeight = "700";
    launcher.style.cursor = "pointer";
    launcher.style.boxShadow = "0 14px 40px rgba(15,23,42,0.24)";
    launcher.style.zIndex = "2147483001";

    var frameLoaded = false;

    launcher.addEventListener("click", function () {
      var currentlyOpen = frame.style.display !== "none";

      if (currentlyOpen) {
        frame.style.display = "none";
        launcher.textContent = launcherText;
        launcher.setAttribute("aria-label", launcherText);
        launcher.setAttribute("aria-expanded", "false");
        return;
      }

      if (!frameLoaded) {
        frame.src = widgetUrl;
        frameLoaded = true;
      }

      frame.style.display = "block";
      launcher.textContent = "Close chat";
      launcher.setAttribute("aria-label", "Close chat");
      launcher.setAttribute("aria-expanded", "true");
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
    <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8 lg:px-10 lg:py-8">
          <div
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-[0.08] blur-2xl"
            style={{ backgroundColor: whatsappPrimary }}
          />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Website Experience
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Website Widget
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-[15px]">
                Personalise your enquiry chatbot, control where it can load,
                preview the experience, and copy the production embed code.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={widgetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Widget
              </a>

              <button
                type="submit"
                form="widget-settings-form"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </section>

        {params.saved === "1" && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Widget settings saved successfully.
          </div>
        )}

        {params.error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {params.error === "required"
              ? "Launcher text and welcome message are required."
              : params.error === "color"
                ? "Please enter a valid HEX color."
                : "Widget settings could not be saved."}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Widget Status"
            value={isActive ? "Active" : "Inactive"}
            accentClass="bg-emerald-50 text-emerald-700"
          />
          <MiniStat
            icon={<Bot className="h-5 w-5" />}
            title="Automation"
            value={company.botEnabled ? "Bot Enabled" : "Bot Disabled"}
            accentClass="bg-sky-50 text-sky-700"
          />
          <MiniStat
            icon={<Languages className="h-5 w-5" />}
            title="Languages"
            value={enableArabic ? "English + Arabic" : "English"}
            accentClass="bg-violet-50 text-violet-700"
          />
          <MiniStat
            icon={<Smartphone className="h-5 w-5" />}
            title="Placement"
            value={
              settings?.position === "BOTTOM_LEFT"
                ? "Bottom Left"
                : "Bottom Right"
            }
            accentClass="bg-amber-50 text-amber-700"
          />
        </div>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <form
            id="widget-settings-form"
            action={saveWidgetSettings}
            className="space-y-6"
          >
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Appearance & Branding
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Shape the first impression visitors see when the chat opens.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Display Name"
                  name="displayName"
                  defaultValue={displayName}
                  hint="Shown in the chat header"
                />

                <Field
                  label="Subtitle"
                  name="subtitle"
                  defaultValue={subtitle}
                  hint="Short response or availability message"
                />

                <Field
                  label="Launcher Text"
                  name="launcherText"
                  defaultValue={launcherText}
                  required
                  hint="Text shown on the website launcher"
                />

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Primary Color
                  </label>
                  <div className="flex h-[50px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                    <input
                      type="color"
                      name="primaryColor"
                      defaultValue={primaryColor}
                      className="h-9 w-12 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                    />
                    <div
                      className="h-7 w-7 rounded-full ring-4 ring-slate-100"
                      style={{ backgroundColor: whatsappPrimary }}
                    />
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {primaryColor}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Used for the external website launcher. The chat itself uses the WhatsApp-style palette.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Widget Position
                  </label>
                  <select
                    name="position"
                    defaultValue={settings?.position ?? "BOTTOM_RIGHT"}
                    className="h-[50px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="BOTTOM_RIGHT">Bottom Right</option>
                    <option value="BOTTOM_LEFT">Bottom Left</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Choose which side of the website shows the launcher.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Default Language
                  </label>
                  <select
                    name="defaultLanguage"
                    defaultValue={settings?.defaultLanguage ?? "en"}
                    className="h-[50px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Visitors can still choose another enabled language.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Welcome Message
                </label>
                <textarea
                  name="welcomeMessage"
                  defaultValue={welcomeMessage}
                  required
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Keep this warm and concise so visitors know what to do next.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Behaviour & Data Capture
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Control automation, visitor details, handoff and sound.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
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
                  description="Offer Arabic as a conversation language."
                  defaultChecked={enableArabic}
                />
                <Toggle
                  name="enableSound"
                  label="Widget Sound"
                  description="Play notification sounds inside the widget."
                  defaultChecked={enableSound}
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
                  description="Ask for a visitor contact number."
                  defaultChecked={collectPhone}
                />
                <Toggle
                  name="collectEmail"
                  label="Collect Email"
                  description="Ask for an email address when enabled."
                  defaultChecked={collectEmail}
                />
                <Toggle
                  name="requireConsent"
                  label="Require Consent"
                  description="Ask permission before capturing enquiry details."
                  defaultChecked={requireConsent}
                />
                <Toggle
                  name="humanHandoffEnabled"
                  label="Marketing Executive Handoff"
                  description="Transfer qualified enquiries to the CRM team."
                  defaultChecked={humanHandoffEnabled}
                />
                <Toggle
                  name="whatsappHandoffEnabled"
                  label="WhatsApp Handoff"
                  description="Allow visitors to continue in WhatsApp."
                  defaultChecked={whatsappHandoffEnabled}
                />
              </div>

              <div className="mt-5">
                <Field
                  label="WhatsApp Handoff Number"
                  name="whatsappHandoffNumber"
                  defaultValue={settings?.whatsappHandoffNumber ?? ""}
                  placeholder="+971..."
                  hint="Used only when Continue on WhatsApp is enabled"
                />
              </div>

              <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-95"
                  style={{ backgroundColor: whatsappPrimary }}
                >
                  <Save className="h-4 w-4" />
                  Save Widget Settings
                </button>

                <a
                  href={widgetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open Live Widget
                </a>
              </div>
            </div>
          </form>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Live Preview
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">
                    Visitor Experience
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Preview
                </div>
              </div>

              <div className="relative min-h-[650px] overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-100 p-4 sm:p-7">
                <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(34,197,94,0.16)_1px,transparent_0)] [background-size:22px_22px]" />

                <div className="relative mx-auto overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur">
                  <div
                    className="relative overflow-hidden px-5 py-5 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${whatsappHeader} 0%, rgba(0,112,92,1) 55%, rgba(0,92,75,1) 100%)`,
                    }}
                  >
                    <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/10" />
                    <div className="relative flex items-center gap-3">
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-lg font-black backdrop-blur">
                        {displayName.trim().charAt(0).toUpperCase() || "C"}
                        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: whatsappLauncher }} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{displayName}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-white/85">
                          <span className="h-2 w-2 rounded-full bg-emerald-200 ring-4 ring-white/10" />
                          <span className="truncate">{subtitle}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-[390px] space-y-4 px-4 py-5" style={{ backgroundColor: whatsappChatBackground }}>
                    <div className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
                      Today
                    </div>

                    <div className="flex items-end gap-2">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: whatsappPrimary }}
                      >
                        {displayName.trim().charAt(0).toUpperCase() || "C"}
                      </div>
                      <div
                        className="max-w-[82%] rounded-[16px] rounded-bl-sm px-4 py-3 text-sm leading-6 shadow-sm"
                        style={{
                          backgroundColor: whatsappIncoming,
                          color: whatsappText,
                        }}
                      >
                        {welcomeMessage}
                        <p className="mt-1.5 text-right text-[9px] text-slate-400">
                          10:30 AM
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">ME</div>
                      <div>
                        <p className="font-bold">Marketing Executive</p>
                        <p className="text-[10px] text-emerald-700">Online and ready to assist</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div
                        className="max-w-[76%] rounded-[16px] rounded-br-sm px-4 py-3 text-sm leading-6 shadow-sm"
                        style={{
                          backgroundColor: whatsappOutgoing,
                          color: whatsappText,
                        }}
                      >
                        I would like to know more about your programmes.
                        <p className="mt-1.5 text-right text-[9px]" style={{ color: whatsappMuted }}>
                          10:31 AM ✓✓
                        </p>
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: whatsappPrimary }}
                      >
                        {displayName.trim().charAt(0).toUpperCase() || "C"}
                      </div>
                      <div
                        className="max-w-[82%] rounded-[16px] rounded-bl-sm px-4 py-3 text-sm leading-6 shadow-sm"
                        style={{
                          backgroundColor: whatsappIncoming,
                          color: whatsappText,
                        }}
                      >
                        Of course. I can help with programmes, fees, admissions
                        or connect you with a Marketing Executive.
                        <p className="mt-1.5 text-right text-[9px] text-slate-400">
                          10:31 AM
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {["Programmes", "Fees & duration", "Admission", "Marketing Executive"].map(
                        (label) => (
                          <div
                            key={label}
                            className="rounded-xl border bg-white px-3 py-2.5 text-center text-[11px] font-bold shadow-sm"
                            style={{
                              borderColor: "rgba(0,168,132,0.35)",
                              color: whatsappPrimary,
                            }}
                          >
                            {label}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-white p-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="flex-1 text-xs text-slate-400">
                        Type your message...
                      </span>
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: whatsappPrimary }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-medium text-slate-400">
                      <ShieldCheck className="h-3 w-3" />
                      Secure and private conversation
                    </div>
                  </div>
                </div>

                <div
                  className={`relative mt-5 flex ${
                    settings?.position === "BOTTOM_LEFT"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)]"
                    style={{ backgroundColor: whatsappPrimary }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {launcherText}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Allowed Domains
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  The widget can only load from websites listed here.
                </p>
              </div>
            </div>

            {params.domain === "added" && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Domain added successfully.
              </div>
            )}

            {params.domain === "removed" && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Domain removed successfully.
              </div>
            )}

            {params.domainError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {params.domainError === "invalid"
                  ? "Enter a valid domain, for example uca.feuc.ae."
                  : params.domainError === "company"
                    ? "This account is not assigned to a company."
                    : "Domain could not be saved."}
              </div>
            )}

            <form
              action={addAllowedDomain}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="domain"
                  required
                  placeholder="example.com"
                  className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </div>

              <button
                type="submit"
                className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Add Domain
              </button>
            </form>

            <div className="mt-5 space-y-2.5">
              {company.widgetDomains.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <Globe2 className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    No production domain is allowed yet.
                  </p>
                </div>
              ) : (
                company.widgetDomains.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <code className="block truncate text-sm font-semibold text-slate-700">
                          {item.domain}
                        </code>
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                          Active
                        </p>
                      </div>
                    </div>

                    <form action={removeAllowedDomain}>
                      <input type="hidden" name="domainId" value={item.id} />
                      <button
                        type="submit"
                        title="Remove domain"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Embed Code
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Paste this snippet before the closing body tag on an approved
                  website.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  HTML / JavaScript
                </span>
              </div>

              <textarea
                id="widget-embed-code"
                readOnly
                value={embedCode}
                rows={15}
                className="w-full resize-y border-0 bg-transparent p-4 font-mono text-[11px] leading-6 text-emerald-300 outline-none"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-slate-400">
                Widget key: <span className="font-mono">{company.widgetKey}</span>
              </p>

              <button
                type="button"
                data-copy-widget-code
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy Embed Code
              </button>
            </div>
          </div>
        </section>

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
                    button.innerHTML = "Copy Embed Code";
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

function MiniStat({
  icon,
  title,
  value,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900">
            {value}
          </p>
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
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-[50px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
      />

      {hint && (
        <p className="mt-2 text-xs leading-5 text-slate-400">{hint}</p>
      )}
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
    <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40">
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}