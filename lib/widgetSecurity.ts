import crypto from "node:crypto";

const TOKEN_BYTES = 32;
const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS = 5 * 60;

export type WidgetAccessTokenPayload = {
  companyId: string;
  widgetKey: string;
  origin: string;
  issuedAt: number;
  expiresAt: number;
};

function getWidgetSigningSecret(): Buffer {
  const encodedSecret = process.env.WIDGET_SIGNING_SECRET;

  if (!encodedSecret) {
    throw new Error("WIDGET_SIGNING_SECRET is missing.");
  }

  const secret = Buffer.from(encodedSecret, "base64");

  if (secret.length !== 32) {
    throw new Error(
      "WIDGET_SIGNING_SECRET must decode to exactly 32 bytes."
    );
  }

  return secret;
}

function createHmacSignature(value: string): string {
  return crypto
    .createHmac("sha256", getWidgetSigningSecret())
    .update(value, "utf8")
    .digest("base64url");
}

function signaturesMatch(
  receivedSignature: string,
  expectedSignature: string
): boolean {
  try {
    const receivedBuffer = Buffer.from(
      receivedSignature,
      "base64url"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "base64url"
    );

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}

export function createVisitorSessionToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashVisitorSessionToken(
  sessionToken: string
): string {
  const normalizedToken = sessionToken.trim();

  if (
    normalizedToken.length < 20 ||
    normalizedToken.length > 200
  ) {
    throw new Error("Visitor session token is invalid.");
  }

  return crypto
    .createHmac("sha256", getWidgetSigningSecret())
    .update(`visitor-session:${normalizedToken}`, "utf8")
    .digest("hex");
}

export function createWidgetAccessToken({
  companyId,
  widgetKey,
  origin,
  expiresInSeconds = DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS,
}: {
  companyId: string;
  widgetKey: string;
  origin: string;
  expiresInSeconds?: number;
}): string {
  const normalizedOrigin = origin.trim().toLowerCase();

  if (!companyId || !widgetKey || !normalizedOrigin) {
    throw new Error(
      "Company ID, widget key and origin are required."
    );
  }

  const safeLifetime = Math.min(
    Math.max(expiresInSeconds, 60),
    15 * 60
  );

  const currentTime = Math.floor(Date.now() / 1000);

  const payload: WidgetAccessTokenPayload = {
    companyId,
    widgetKey,
    origin: normalizedOrigin,
    issuedAt: currentTime,
    expiresAt: currentTime + safeLifetime,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");

  const signature = createHmacSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyWidgetAccessToken(
  token: string
): WidgetAccessTokenPayload | null {
  try {
    const [encodedPayload, receivedSignature, extraPart] =
      token.split(".");

    if (
      !encodedPayload ||
      !receivedSignature ||
      extraPart !== undefined
    ) {
      return null;
    }

    const expectedSignature =
      createHmacSignature(encodedPayload);

    if (
      !signaturesMatch(
        receivedSignature,
        expectedSignature
      )
    ) {
      return null;
    }

    const parsedPayload: unknown = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    );

    if (
      typeof parsedPayload !== "object" ||
      parsedPayload === null
    ) {
      return null;
    }

    const payload =
      parsedPayload as Partial<WidgetAccessTokenPayload>;

    if (
      typeof payload.companyId !== "string" ||
      typeof payload.widgetKey !== "string" ||
      typeof payload.origin !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);

    if (
      payload.expiresAt <= currentTime ||
      payload.issuedAt > currentTime + 60
    ) {
      return null;
    }

    if (
      payload.expiresAt - payload.issuedAt >
      15 * 60
    ) {
      return null;
    }

    return {
      companyId: payload.companyId,
      widgetKey: payload.widgetKey,
      origin: payload.origin,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export function normalizeWidgetOrigin(
  value: string
): string | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeAllowedDomain(
  value: string
): string | null {
  const trimmedValue = value.trim().toLowerCase();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = trimmedValue.includes("://")
      ? new URL(trimmedValue)
      : new URL(`https://${trimmedValue}`);

    return url.hostname
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return null;
  }
}

export function originMatchesDomain(
  origin: string,
  allowedDomain: string
): boolean {
  try {
    const hostname = new URL(origin).hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const domain = allowedDomain
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");

    return (
      hostname === domain ||
      hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}