import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.WHATSAPP_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error("WHATSAPP_ENCRYPTION_KEY is missing.");
  }

  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "WHATSAPP_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
}

export function encryptSecret(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("Secret value cannot be empty.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(trimmedValue, "utf8"),
    cipher.final(),
  ]);

  const authenticationTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authenticationTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");

  if (parts.length !== 3) {
    throw new Error("Encrypted secret has an invalid format.");
  }

  const [ivValue, tagValue, encryptedValue] = parts;

  const iv = Buffer.from(ivValue, "base64");
  const authenticationTag = Buffer.from(tagValue, "base64");
  const encrypted = Buffer.from(encryptedValue, "base64");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  decipher.setAuthTag(authenticationTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}