export function canonicalAppOrigin(requestUrl: string, appUrl?: string) {
  const url = new URL(appUrl || requestUrl);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    throw new Error("APP_URL must be an HTTP(S) origin without credentials.");
  }
  return url.origin;
}

/** Browser session mutations must originate from this application. Webhooks use signatures. */
export function isAllowedMutation(request: Request, appUrl?: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return fetchSite !== "same-site";
  try {
    return origin === canonicalAppOrigin(request.url, appUrl);
  } catch {
    return false;
  }
}
