/**
 * Bulletproof local redirect sanitizer.
 * Guarantees that arbitrary inputs cannot cause open redirects to external domains,
 * protocol-relative URLs (//evil.com), backslash tricks (/\\evil.com), or javascript:/data: URIs.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback = "/account"): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();

  // Must begin with a single forward slash and not double forward slash or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
    return fallback;
  }

  // Reject newlines, CR, null bytes, or URI schemes
  if (/[\r\n\0]/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  try {
    // Parse against a dummy local base
    const parsed = new URL(trimmed, "http://localhost");
    // If the origin changed, an external host was injected
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }
    const finalPath = parsed.pathname + parsed.search + parsed.hash;
    if (!finalPath.startsWith("/") || finalPath.startsWith("//") || finalPath.startsWith("/\\")) {
      return fallback;
    }
    return finalPath;
  } catch {
    return fallback;
  }
}
