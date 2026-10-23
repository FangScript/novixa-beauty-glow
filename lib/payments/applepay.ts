export function resolveApplePayConfig(config: any) {
  if (!config?.isEligible)
    throw new Error("Apple Pay is not enabled for this PayPal merchant and domain.");
  if (
    !/^[A-Z]{2}$/.test(config.countryCode || "") ||
    !Array.isArray(config.merchantCapabilities) ||
    !config.merchantCapabilities.includes("supports3DS") ||
    !Array.isArray(config.supportedNetworks) ||
    !config.supportedNetworks.length
  )
    throw new Error("PayPal returned incomplete Apple Pay configuration.");
  return {
    countryCode: config.countryCode as string,
    merchantCapabilities: config.merchantCapabilities as string[],
    supportedNetworks: config.supportedNetworks as string[],
  };
}
