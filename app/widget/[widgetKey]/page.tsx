import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import WidgetClient from "./WidgetClient";

export const dynamic = "force-dynamic";

type WidgetPageProps = {
  params: Promise<{
    widgetKey: string;
  }>;
};

function getHostnameFromUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

function getApplicationHostname(value: string | null) {
  if (!value) {
    return "";
  }

  const firstHost = value.split(",")[0].trim();

  try {
    return new URL(`http://${firstHost}`)
      .hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return firstHost.toLowerCase().replace(/\.$/, "");
  }
}

function normalizeStoredDomain(value: string) {
  const raw = value.trim().toLowerCase();

  try {
    return new URL(
      /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    )
      .hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return raw.replace(/\.$/, "");
  }
}

export default async function WidgetPage({
  params,
}: WidgetPageProps) {
  const { widgetKey } = await params;

  const [session, requestHeaders] = await Promise.all([
    auth(),
    headers(),
  ]);

  const company = await prisma.company.findFirst({
    where: {
      widgetKey,
      isActive: true,
    },
    select: {
      id: true,
      widgetSettings: {
        select: {
          isActive: true,
        },
      },
      widgetDomains: {
        where: {
          isActive: true,
        },
        select: {
          domain: true,
        },
      },
    },
  });

  if (
    !company ||
    company.widgetSettings?.isActive === false
  ) {
    notFound();
  }

  const hostHeader =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");

  const applicationHostname =
    getApplicationHostname(hostHeader);

  const referrerHostname = getHostnameFromUrl(
    requestHeaders.get("referer")
  );

  // Logged-in company users can always use the dashboard Test Widget.
  const isDashboardPreview =
    session?.user?.companyId === company.id;

  // Keep direct localhost CRM testing available.
  const isLocalDevelopment =
    applicationHostname === "localhost" ||
    applicationHostname === "127.0.0.1" ||
    applicationHostname === "::1";

  // Requests initiated by the CRM application itself are allowed.
  const isSameApplicationHost =
    Boolean(referrerHostname) &&
    referrerHostname === applicationHostname;

  // External production websites must exactly match an active WidgetDomain.
  const isAllowedExternalDomain =
    Boolean(referrerHostname) &&
    company.widgetDomains.some(
      (item) =>
        normalizeStoredDomain(item.domain) ===
        referrerHostname
    );

  if (
    !isDashboardPreview &&
    !isLocalDevelopment &&
    !isSameApplicationHost &&
    !isAllowedExternalDomain
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-transparent">
      <WidgetClient widgetKey={widgetKey} />
    </main>
  );
}