import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_SECRET = "novixa-auth-secret-super-secure-key-32chars";

function getSecret(): string {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

/**
 * Returns the canonical redirect URI for Google OAuth.
 * In production, it prioritizes process.env.APP_URL so that Google Cloud Console
 * authorized redirect URIs match exactly whether accessed via www or proxy.
 */
export function getGoogleRedirectUri(request: Request): string {
  const url = new URL(request.url);

  // In production, use APP_URL if configured
  if (process.env.NODE_ENV === "production" && process.env.APP_URL) {
    const appUrl = process.env.APP_URL.replace(/\/+$/, "");
    return `${appUrl}/api/auth/customer/google/callback`;
  }

  // In development, or if APP_URL is not set, derive from request origin
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}/api/auth/customer/google/callback`;
}

/**
 * Returns the canonical base URL for post-login redirection.
 */
export function getBaseAppUrl(request: Request): string {
  const url = new URL(request.url);
  if (process.env.NODE_ENV === "production" && process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
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
    const parts = state.split(".");
    if (parts.length !== 2) return { valid: false, next: "/account" };

    const [payload, signature] = parts;
    if (!payload || !signature) return { valid: false, next: "/account" };

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

    // Expire state after 30 minutes
    if (isNaN(timestamp) || Date.now() - timestamp > 30 * 60 * 1000) {
      return { valid: false, next: "/account" };
    }

    const next = encodedNext ? decodeURIComponent(encodedNext) : "/account";
    return { valid: true, next: next.startsWith("/") ? next : `/${next}` };
  } catch (err) {
    console.error("verifySignedState error:", err);
    return { valid: false, next: "/account" };
  }
}
