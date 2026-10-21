export function validateAppleSessionTarget(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !/^(?:cn-)?apple-pay-gateway(?:-cert)?\.apple\.com$/.test(url.hostname) ||
    url.pathname !== "/paymentservices/startSession"
  ) {
    throw new Error("Invalid Apple Pay merchant validation URL.");
  }
  return url;
}
