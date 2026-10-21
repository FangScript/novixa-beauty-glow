import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { authSecret } from "../security/signing";
import { canonicalAppOrigin } from "../security/request";

function getSecret(): string {
  return authSecret();
}

/**
 * Returns the canonical redirect URI for Google OAuth.
 * In production, it prioritizes process.env.APP_URL so that Google Cloud Console
 * authorized redirect URIs match exactly whether accessed via www or proxy.
 */
export function getGoogleRedirectUri(request: Request): string {
  return `${getBaseAppUrl(request)}/api/auth/customer/google/callback`;
}

/**
 * Returns the canonical base URL for post-login redirection.
 */
export function getBaseAppUrl(request: Request): string {
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL)
    throw new Error("APP_URL is required in production.");
  return canonicalAppOrigin(request.url, process.env.APP_URL);
}

/**
 * Creates a cryptographically signed state token containing:
 * - random nonce (CSRF)
 * - creation timestamp
 * - destination URL (next)
 * - HMAC signature
 */
export function createSignedState(next: string = "/account"): string {
  const secret = getSecret();
  const nonce = randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const safeNext = encodeURIComponent(next.startsWith("/") ? next : `/${next}`);
  const payload = `${nonce}:${timestamp}:${safeNext}`;

  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verifies the HMAC signature and expiration of the returned state token.
 * Prevents CSRF without relying solely on cross-domain cookies.
 */
export function verifySignedState(state: string | null): { valid: boolean; next: string } {
  if (!state) return { valid: false, next: "/account" };

  try {
    const secret = getSecret();
    const separator = state.lastIndexOf(".");
    if (separator < 0) return { valid: false, next: "/account" };
    const payload = state.slice(0, separator),
      signature = state.slice(separator + 1);
    if (!payload || !/^[a-f0-9]{64}$/.test(signature)) return { valid: false, next: "/account" };

    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, next: "/account" };
    }

    const payloadParts = payload.split(":");
    if (payloadParts.length < 3) return { valid: false, next: "/account" };

    const [, timestampStr, encodedNext] = payloadParts;
    const timestamp = parseInt(timestampStr, 10);

    // Expire state after 15 minutes
    if (
      !Number.isSafeInteger(timestamp) ||
      timestamp > Date.now() ||
      Date.now() - timestamp > 15 * 60 * 1000
    ) {
      return { valid: false, next: "/account" };
    }

    const next = encodedNext ? decodeURIComponent(encodedNext) : "/account";
    return { valid: true, next: next.startsWith("/") ? next : `/${next}` };
  } catch (err) {
    console.error("verifySignedState error:", err);
    return { valid: false, next: "/account" };
  }
}
