import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createWidgetAccessToken,
  normalizeAllowedDomain,
  normalizeWidgetOrigin,
  originMatchesDomain,
} from "@/lib/widgetSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WidgetConfigRouteProps = {
  params: Promise<{
    widgetKey: string;
  }>;
};

type WidgetCompany = NonNullable<
  Awaited<ReturnType<typeof getWidgetCompany>>
>;

function getRequestOrigin(request: NextRequest): string | null {
  const originHeader = request.headers.get("origin");

  if (originHeader) {
    const normalizedOrigin =
      normalizeWidgetOrigin(originHeader);

    if (normalizedOrigin) {
      return normalizedOrigin;
    }
  }

  const refererHeader = request.headers.get("referer");

  if (refererHeader) {
    return normalizeWidgetOrigin(refererHeader);
  }

  return null;
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Widget-Access-Token",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, max-age=0",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const hostname = new URL(origin).hostname;

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function getAllowedDomains(company: WidgetCompany): string[] {
  const domains = company.widgetDomains
    .map((item) => normalizeAllowedDomain(item.domain))
    .filter((domain): domain is string => Boolean(domain));

  const websiteDomain = company.websiteUrl
    ? normalizeAllowedDomain(company.websiteUrl)
    : null;

  if (websiteDomain) {
    domains.push(websiteDomain);
  }

  return [...new Set(domains)];
}

function isOriginAllowed({
  origin,
  requestOrigin,
  allowedDomains,
}: {
  origin: string;
  requestOrigin: string;
  allowedDomains: string[];
}): boolean {
  if (origin === requestOrigin) {
    return true;
  }

  if (isLocalDevelopmentOrigin(origin)) {
    return true;
  }

  return allowedDomains.some((domain) =>
    originMatchesDomain(origin, domain)
  );
}

async function getWidgetCompany(widgetKey: string) {
  return prisma.company.findUnique({
    where: {
      widgetKey,
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      websiteUrl: true,
      primaryColor: true,
      widgetKey: true,
      messagingMode: true,
      botEnabled: true,
      isActive: true,

      widgetSettings: {
        select: {
          displayName: true,
          subtitle: true,
          launcherText: true,
          welcomeMessage: true,
          offlineMessage: true,
          humanHandoffMessage: true,
          consentText: true,
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
          showOnlineStatus: true,
          showAgentAvatars: true,
          enableSound: true,
          autoOpenDelaySeconds: true,
          privacyPolicyUrl: true,
          businessHours: true,
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

      programmes: {
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          fee: true,
          duration: true,
        },
      },

      botFaqs: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          question: true,
          answer: true,
          language: true,
          category: true,
          sortOrder: true,
        },
      },
    },
  });
}

async function resolveWidgetRequest(
  request: NextRequest,
  widgetKey: string
) {
  const origin = getRequestOrigin(request);

  if (!origin) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Website origin could not be identified.",
        },
        {
          status: 400,
        }
      ),
      company: null,
      origin: null,
    };
  }

  const company = await getWidgetCompany(widgetKey);

  if (
    !company ||
    !company.isActive ||
    company.widgetSettings?.isActive === false
  ) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Widget is unavailable.",
        },
        {
          status: 404,
          headers: createCorsHeaders(origin),
        }
      ),
      company: null,
      origin,
    };
  }

  const allowedDomains = getAllowedDomains(company);

  const allowed = isOriginAllowed({
    origin,
    requestOrigin: request.nextUrl.origin.toLowerCase(),
    allowedDomains,
  });

  if (!allowed) {
    console.warn("Blocked widget request from domain:", {
      companyId: company.id,
      origin,
    });

    return {
      error: NextResponse.json(
        {
          success: false,
          error:
            "This website is not authorized to use the widget.",
        },
        {
          status: 403,
        }
      ),
      company: null,
      origin,
    };
  }

  return {
    error: null,
    company,
    origin,
  };
}

export async function OPTIONS(
  request: NextRequest,
  { params }: WidgetConfigRouteProps
) {
  const { widgetKey } = await params;

  const result = await resolveWidgetRequest(
    request,
    widgetKey
  );

  if (result.error) {
    return result.error;
  }

  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders(result.origin!),
  });
}

export async function GET(
  request: NextRequest,
  { params }: WidgetConfigRouteProps
) {
  const { widgetKey } = await params;

  try {
    const result = await resolveWidgetRequest(
      request,
      widgetKey
    );

 if (result.error) {
  return result.error;
}

if (!result.company || !result.origin) {
  return NextResponse.json(
    {
      success: false,
      error: "Widget request could not be resolved.",
    },
    {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

    const company = result.company;
    const settings = company.widgetSettings;

    const accessToken = createWidgetAccessToken({
      companyId: company.id,
      widgetKey: company.widgetKey,
      origin: result.origin,
      expiresInSeconds: 5 * 60,
    });

    return NextResponse.json(
      {
        success: true,

        data: {
          accessToken,
          accessTokenExpiresInSeconds: 300,

          company: {
            name: company.name,
            logoUrl: company.logoUrl,
            websiteUrl: company.websiteUrl,
          },

          widget: {
            displayName:
              settings?.displayName ?? company.name,

            subtitle:
              settings?.subtitle ??
              "We are here to help",

            launcherText:
              settings?.launcherText ??
              "Chat with us",

            welcomeMessage:
              settings?.welcomeMessage ??
              "Hello! How can we help you today?",

            offlineMessage:
              settings?.offlineMessage ??
              "Our team is currently offline. Please leave your details.",

            humanHandoffMessage:
              settings?.humanHandoffMessage ??
              "Your chat has been transferred to a Marketing Executive.",

            consentText:
              settings?.consentText ??
              "I agree to share my details for enquiry support.",

            primaryColor:
              settings?.primaryColor ||
              company.primaryColor,

            position:
              settings?.position ??
              "BOTTOM_RIGHT",

            defaultLanguage:
              settings?.defaultLanguage ?? "en",

            enableArabic:
              settings?.enableArabic ?? false,

            collectName:
              settings?.collectName ?? true,

            collectPhone:
              settings?.collectPhone ?? true,

            collectEmail:
              settings?.collectEmail ?? true,

            requireConsent:
              settings?.requireConsent ?? true,

            humanHandoffEnabled:
              settings?.humanHandoffEnabled ?? true,

            whatsappHandoffEnabled:
              settings?.whatsappHandoffEnabled ?? true,

            whatsappHandoffNumber:
              settings?.whatsappHandoffNumber ?? null,

            showOnlineStatus:
              settings?.showOnlineStatus ?? true,

            showAgentAvatars:
              settings?.showAgentAvatars ?? true,

            enableSound:
              settings?.enableSound ?? true,

            autoOpenDelaySeconds:
              settings?.autoOpenDelaySeconds ?? 0,

            privacyPolicyUrl:
              settings?.privacyPolicyUrl ?? null,

            businessHours:
              settings?.businessHours ?? null,

            botEnabled: company.botEnabled,
            messagingMode: company.messagingMode,
          },

          programmes: company.programmes,

          faqs: company.botFaqs,
        },
      },
      {
        status: 200,
        headers: createCorsHeaders(result.origin),
      }
    );
  } catch (error) {
    console.error(
      "Widget configuration API error:",
      error
    );

    const origin = getRequestOrigin(request);

    return NextResponse.json(
      {
        success: false,
        error:
          "Widget configuration could not be loaded.",
      },
      {
        status: 500,
        headers: origin
          ? createCorsHeaders(origin)
          : {
              "Cache-Control": "no-store",
            },
      }
    );
  }
}