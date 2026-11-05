import { createHmac, timingSafeEqual } from "node:crypto";

export const SITE_ACCESS_COOKIE = "numenera-site-access";
export const SITE_ACCESS_SESSION_SECONDS = 7 * 24 * 60 * 60;

export function getSiteAccessConfig() {
  const password = process.env.SITE_ACCESS_PASSWORD;
  const signingSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  return password && signingSecret ? { password, signingSecret } : null;
}

export function matchesSecret(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length &&
    timingSafeEqual(candidateBytes, expectedBytes);
}

export function createSiteAccessSession(signingSecret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SITE_ACCESS_SESSION_SECONDS;
  const signature = signExpiry(expiresAt, signingSecret);
  return `${expiresAt}.${signature}`;
}

export function isValidSiteAccessSession(
  value: string | undefined,
  signingSecret: string,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const [expiresAtText, signature, ...rest] = value.split(".");
  if (rest.length > 0 || !/^\d+$/.test(expiresAtText) || !signature) return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;

  return matchesSecret(signature, signExpiry(expiresAt, signingSecret));
}

export function getCookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  const prefix = `${name}=`;
  const cookie = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie?.slice(prefix.length);
}

function signExpiry(expiresAt: number, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(String(expiresAt)).digest("base64url");
}
