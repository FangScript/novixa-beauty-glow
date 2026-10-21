export type GooglePayEnvironment = "TEST" | "PRODUCTION";

export interface GooglePayMethod {
  type: string;
  parameters: Record<string, unknown>;
  tokenizationSpecification?: {
    type: string;
    parameters: { gateway?: string; gatewayMerchantId?: string };
  };
}

export interface PayPalGooglePayConfig {
  isEligible?: boolean;
  allowedPaymentMethods: GooglePayMethod[];
  merchantInfo: { merchantName?: string; merchantId?: string; [key: string]: unknown };
}

export interface PayPalGooglePayHelper {
  config(): Promise<PayPalGooglePayConfig>;
  confirmOrder(input: { orderId: string; paymentMethodData: unknown }): Promise<{ status: string }>;
  initiatePayerAction(input: { orderId: string }): Promise<{ liabilityShift?: string }>;
}

export function resolveGooglePayConfig(
  config: PayPalGooglePayConfig,
  settings: {
    environment: string;
    merchantId?: string;
    paypalMode?: string;
    origin: string;
    clientId: string;
  },
) {
  const environment = settings.environment.trim();
  if (environment !== "TEST" && environment !== "PRODUCTION") {
    throw new Error("NEXT_PUBLIC_GOOGLE_PAY_ENV must be TEST or PRODUCTION.");
  }
  if (!settings.clientId.trim()) throw new Error("PayPal client ID is not configured.");
  const paypalMode = settings.paypalMode?.trim().toLowerCase();
  if (
    (environment === "PRODUCTION" && paypalMode !== "live") ||
    (environment === "TEST" && paypalMode !== "sandbox")
  ) {
    throw new Error("Google Pay and PayPal environments do not match.");
  }
  if (environment === "PRODUCTION" && new URL(settings.origin).protocol !== "https:") {
    throw new Error("Google Pay production checkout requires HTTPS.");
  }
  if (config?.isEligible === false) {
    throw new Error("This PayPal account is not eligible for Google Pay.");
  }
  if (
    !Array.isArray(config?.allowedPaymentMethods) ||
    !config.allowedPaymentMethods.length ||
    !config.allowedPaymentMethods.some(
      (method) =>
        method.type === "CARD" &&
        method.tokenizationSpecification?.type === "PAYMENT_GATEWAY" &&
        method.tokenizationSpecification.parameters.gateway,
    )
  ) {
    throw new Error("PayPal did not return a valid Google Pay gateway configuration.");
  }
  const configuredMerchantId = settings.merchantId?.trim();
  const sdkMerchantId = config.merchantInfo?.merchantId?.trim();
  // PayPal's merchant identity belongs to its gateway configuration. Replacing it
  // with a separate Console ID can make Google reject an otherwise eligible account.
  const merchantId = sdkMerchantId || configuredMerchantId;
  if (environment === "PRODUCTION" && !merchantId) {
    throw new Error("A Google Pay production merchant ID is required.");
  }
  const merchantInfo: PayPalGooglePayConfig["merchantInfo"] = {
    ...config.merchantInfo,
    merchantName: config.merchantInfo?.merchantName || "NOVIXA UK",
    merchantId: environment === "PRODUCTION" ? merchantId : undefined,
  };
  return {
    environment: environment as GooglePayEnvironment,
    merchantInfo,
    allowedPaymentMethods: config.allowedPaymentMethods,
    diagnostics: {
      environment,
      origin: settings.origin,
      merchantId: environment === "PRODUCTION" ? merchantId : null,
      merchantIdSource: sdkMerchantId ? "paypal-sdk" : "environment-fallback",
      configuredMerchantId: configuredMerchantId || null,
      sdkMerchantId: sdkMerchantId || null,
      paypalMode,
      // Client IDs and merchant IDs are public integration identifiers, not secrets.
      paypalClientId: settings.clientId,
      gateways: config.allowedPaymentMethods.map((method) => ({
        gateway: method.tokenizationSpecification?.parameters.gateway || null,
        gatewayMerchantId: method.tokenizationSpecification?.parameters.gatewayMerchantId || null,
      })),
    },
  };
}

export type ResolvedGooglePayConfig = ReturnType<typeof resolveGooglePayConfig>;

export function googlePayErrorDetails(error: unknown) {
  const value = error as { statusCode?: unknown; statusMessage?: unknown; message?: unknown };
  const clean = (text: unknown) =>
    typeof text === "string"
      ? text
          .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
          .replace(/(token|authorization|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
          .slice(0, 1000)
      : undefined;
  const statusCode = clean(value?.statusCode);
  const statusMessage = clean(value?.statusMessage);
  const message = clean(value?.message) || (typeof error === "string" ? clean(error) : undefined);
  const combined = [statusCode, statusMessage, message].filter(Boolean).join(" ");
  return {
    statusCode,
    statusMessage,
    message,
    cancelled: statusCode === "CANCELED" || statusCode === "CANCELLED",
    merchantError: combined.includes("OR_BIBED_11") || statusCode === "MERCHANT_ACCOUNT_ERROR",
  };
}

export function googlePayCustomerMessage(error: unknown) {
  const details = googlePayErrorDetails(error);
  if (details.merchantError) {
    return "Google Pay could not verify this store's payment configuration. Please use Card or PayPal. Reference: GOOGLE_PAY_MERCHANT.";
  }
  return "Google Pay could not complete checkout. Please try again or use Card or PayPal.";
}

export async function authorizeGooglePayOrder(
  helper: PayPalGooglePayHelper,
  orderId: string,
  paymentMethodData: unknown,
  capture: () => Promise<void>,
) {
  const confirmation = await helper.confirmOrder({ orderId, paymentMethodData });
  if (confirmation.status === "PAYER_ACTION_REQUIRED") {
    const action = await helper.initiatePayerAction({ orderId });
    if (action.liabilityShift !== "YES" && action.liabilityShift !== "POSSIBLE") {
      throw new Error("Google Pay additional card authentication was not successful.");
    }
  } else if (confirmation.status !== "APPROVED" && confirmation.status !== "COMPLETED") {
    throw new Error(`Google Pay authorization is not approved (${confirmation.status}).`);
  }
  // The server independently checks APPROVED/COMPLETED before it captures.
  await capture();
}

export interface GooglePayOrderState {
  status?: string;
  purchase_units?: Array<{
    amount?: { currency_code?: string };
    payments?: { captures?: Array<{ status?: string; amount?: { currency_code?: string } }> };
  }>;
}

export function assertGooglePayOrderCapturable(order: GooglePayOrderState) {
  if (order.status !== "APPROVED" && order.status !== "COMPLETED") {
    throw new Error("Google Pay authorization must be approved before capture.");
  }
  if (order.purchase_units?.length !== 1) {
    throw new Error("Google Pay order must contain one purchase unit.");
  }
  const unit = order.purchase_units[0];
  const captures = unit.payments?.captures || [];
  // Capture responses can omit the purchase-unit amount and include it only on the capture.
  const currency = unit.amount?.currency_code || captures[0]?.amount?.currency_code;
  if (currency !== "GBP") {
    throw new Error("Google Pay order currency must be GBP.");
  }
  if (
    captures.some((capture) => capture.amount?.currency_code !== "GBP") ||
    (order.status === "COMPLETED" && (captures.length !== 1 || captures[0].status !== "COMPLETED"))
  ) {
    throw new Error("Google Pay capture is not complete in GBP.");
  }
}
