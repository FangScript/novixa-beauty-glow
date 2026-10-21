export interface PaymentEnvironment {
  [key: string]: string | undefined;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_MODE?: string;
  NEXT_PUBLIC_PAYPAL_CLIENT_ID?: string;
  NEXT_PUBLIC_PAYPAL_MODE?: string;
  GOOGLE_PAY_ENV?: string;
  GOOGLE_PAY_MERCHANT_ID?: string;
  NEXT_PUBLIC_GOOGLE_PAY_ENV?: string;
  NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID?: string;
}

/** Public SDK settings only. Never return the environment object or provider secret. */
export function publicPaymentConfig(env: PaymentEnvironment) {
  const paypalClientId = (env.PAYPAL_CLIENT_ID || env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
  const publicClientId = env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const paypalMode = env.PAYPAL_MODE?.trim().toLowerCase();
  const publicMode = env.NEXT_PUBLIC_PAYPAL_MODE?.trim().toLowerCase();
  if (!paypalClientId) throw new Error("PayPal client ID is missing.");
  if (publicClientId && publicClientId !== paypalClientId)
    throw new Error("Browser/server PayPal client IDs do not match.");
  if (paypalMode !== "live" && paypalMode !== "sandbox")
    throw new Error("PAYPAL_MODE must be live or sandbox.");
  if (publicMode && publicMode !== paypalMode)
    throw new Error("Browser/server PayPal environments do not match.");
  const googlePayEnvironment = (
    env.GOOGLE_PAY_ENV ||
    env.NEXT_PUBLIC_GOOGLE_PAY_ENV ||
    (paypalMode === "live" ? "PRODUCTION" : "TEST")
  ).trim();
  if (
    (paypalMode === "live" && googlePayEnvironment !== "PRODUCTION") ||
    (paypalMode === "sandbox" && googlePayEnvironment !== "TEST")
  )
    throw new Error("Google Pay and PayPal environments do not match.");
  return {
    paypalClientId,
    paypalMode,
    googlePayEnvironment: googlePayEnvironment as "PRODUCTION" | "TEST",
    googlePayMerchantId: (
      env.GOOGLE_PAY_MERCHANT_ID ||
      env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID ||
      ""
    ).trim(),
  };
}
