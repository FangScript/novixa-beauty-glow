/**
 * PayPal REST API Integration
 * Supports both Sandbox and Live environments configured via environment variables.
 */

interface PayPalTokenResponse {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function getPayPalBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE?.toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function getPayPalClientId(): string {
  return process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
}

export function getPayPalClientSecret(): string {
  return process.env.PAYPAL_CLIENT_SECRET || "";
}

/**
 * Retrieves a valid OAuth2 bearer token from PayPal using client credentials.
 * Automatically caches the token until 60 seconds before its expiration.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = getPayPalClientId();
  const clientSecret = getPayPalClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal Client ID or Secret is missing in environment variables.");
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token;
  }

  const baseUrl = getPayPalBaseUrl();
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain PayPal access token: ${response.status} ${errorText}`);
  }

  const data: PayPalTokenResponse = await response.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  orderNumber?: string;
  customId?: string;
  description?: string;
  paymentSourceType?: "card" | "paypal" | "apple_pay" | "google_pay";
  shippingAddress?: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  items?: Array<{
    name: string;
    unitAmount: number;
    quantity: number;
    sku?: string;
  }>;
}

const COUNTRY_MAP: Record<string, string> = {
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  pakistan: "PK",
  "united states": "US",
  usa: "US",
  canada: "CA",
  australia: "AU",
  germany: "DE",
  france: "FR",
  "united arab emirates": "AE",
  uae: "AE",
  "saudi arabia": "SA",
  india: "IN",
  ireland: "IE",
  netherlands: "NL",
  italy: "IT",
  spain: "ES",
};

export function resolveCountryCode(countryStr?: string): string {
  if (!countryStr) return "GB";
  const trimmed = countryStr.trim().toLowerCase();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_MAP[trimmed] || "GB";
}

/**
 * Creates a new PayPal v2 order for capture.
 */
export async function createPayPalOrder(params: CreateOrderParams) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const currency = params.currency || "GBP";
  const formattedAmount = params.amount.toFixed(2);

  const experienceContext: Record<string, any> = {
    brand_name: "Novixa Beauty & Glow",
    user_action: "PAY_NOW",
    shipping_preference: "NO_SHIPPING",
  };

  const payload: any = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.orderNumber || `NVX-${Date.now()}`,
        custom_id: params.customId || undefined,
        description: params.description || "Novixa Beauty & Glow Purchase",
        amount: {
          currency_code: currency,
          value: formattedAmount,
        },
      },
    ],
  };

  // Only attach shipping address if addressLine1 is present and non-empty
  if (params.shippingAddress && params.shippingAddress.addressLine1?.trim()) {
    const countryCode = resolveCountryCode(params.shippingAddress.countryCode);
    const addressObj: Record<string, string> = {
      address_line_1: params.shippingAddress.addressLine1.trim(),
      admin_area_2: params.shippingAddress.city?.trim() || "London",
      postal_code: params.shippingAddress.postalCode?.trim() || "SW1A 1AA",
      country_code: countryCode,
    };

    // CRITICAL: PayPal schema strictly forbids empty strings ("") in optional fields.
    // Only include address_line_2 and admin_area_1 if they contain actual text.
    if (
      params.shippingAddress.addressLine2 &&
      params.shippingAddress.addressLine2.trim().length > 0
    ) {
      addressObj.address_line_2 = params.shippingAddress.addressLine2.trim();
    }
    if (params.shippingAddress.state && params.shippingAddress.state.trim().length > 0) {
      addressObj.admin_area_1 = params.shippingAddress.state.trim();
    }

    payload.purchase_units[0].shipping = {
      name: {
        full_name: params.shippingAddress.name?.trim() || "Customer",
      },
      address: addressObj,
    };
    experienceContext.shipping_preference = "SET_PROVIDED_ADDRESS";
  }

  // PayPal v2 API: If payment_source is present, experience_context must be inside payment_source.
  // Otherwise, application_context is used at the root level.
  if (params.paymentSourceType === "card") {
    payload.payment_source = {
      card: {
        experience_context: experienceContext,
      },
    };
  } else if (params.paymentSourceType === "paypal") {
    payload.payment_source = {
      paypal: {
        experience_context: experienceContext,
      },
    };
  } else {
    payload.application_context = experienceContext;
  }

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal Create Order Error:", JSON.stringify(data, null, 2));
    const detailMsg = data.details
      ?.map((d: any) => `${d.description || d.issue || ""}${d.field ? " (" + d.field + ")" : ""}`)
      .filter(Boolean)
      .join(". ");
    throw new Error(detailMsg || data.message || "Failed to create PayPal order");
  }

  return data;
}

/**
 * Captures payment for an approved PayPal order.
 */
export async function capturePayPalOrder(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

  const data = await response.json();
  const debugId = response.headers.get("Paypal-Debug-Id") || data?.debug_id;

  if (!response.ok) {
    console.error(
      `PayPal Capture Order Error [orderId: ${paypalOrderId}, status: ${response.status}, debug_id: ${debugId}]:`,
      {
        name: data?.name,
        message: data?.message,
        debug_id: debugId,
        details: data?.details,
      },
    );
    const err = new Error(
      data?.message || data?.details?.[0]?.description || "Failed to capture PayPal payment",
    ) as any;
    err.debugId = debugId;
    err.status = response.status;
    err.details = data?.details;
    throw err;
  }

  return data;
}

/**
 * Retrieves details of an existing PayPal order.
 */
export async function getPayPalOrderDetails(paypalOrderId: string) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch PayPal order details");
  }

  return data;
}

/**
 * Formats and normalizes an Apple Pay payment source for PayPal's Orders v2 API.
 * PayPal Orders v2 schema requires /payment_source/apple_pay/token to be a base64-encoded string
 * (description: "Encrypted ApplePay token, containing card information. This token would be base64encoded.").
 */
export function formatApplePayPaymentSource(applePay: {
  id?: string;
  token?: any;
  [key: string]: any;
}): Record<string, any> {
  const formatted: Record<string, any> = { ...applePay };

  // Set Apple Pay transaction identifier
  const id = applePay.id || applePay.token?.transactionIdentifier;
  if (id && typeof id === "string") {
    formatted.id = id;
  }

  // Format token as base64-encoded string
  if (applePay.token) {
    if (typeof applePay.token === "object") {
      // Runtime PKPaymentToken object containing paymentData, paymentMethod, transactionIdentifier
      formatted.token = Buffer.from(JSON.stringify(applePay.token), "utf8").toString("base64");
    } else if (typeof applePay.token === "string") {
      const trimmed = applePay.token.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        // Raw JSON string -> base64 encode
        formatted.token = Buffer.from(trimmed, "utf8").toString("base64");
      } else {
        // Already a base64 string -> preserve without double-encoding
        formatted.token = trimmed;
      }
    }
  }

  return formatted;
}

/**
 * Confirms a payment source (e.g. Apple Pay, Google Pay) for an existing PayPal order.
 */
export async function confirmPayPalOrderPaymentSource(
  orderId: string,
  paymentSource: Record<string, any>,
) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  // Normalize payment_source to ensure schema compliance
  const normalizedPaymentSource: Record<string, any> = { ...paymentSource };
  if (normalizedPaymentSource.apple_pay) {
    normalizedPaymentSource.apple_pay = formatApplePayPaymentSource(
      normalizedPaymentSource.apple_pay,
    );
  }

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/confirm-payment-source`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ payment_source: normalizedPaymentSource }),
  });

  const data = await response.json();
  const debugId = response.headers.get("Paypal-Debug-Id") || data?.debug_id;

  if (!response.ok) {
    console.error(
      `PayPal Confirm Payment Source Error [orderId: ${orderId}, status: ${response.status}, debug_id: ${debugId}]:`,
      {
        name: data?.name,
        message: data?.message,
        debug_id: debugId,
        details: data?.details?.map((d: any) => ({
          field: d.field,
          issue: d.issue,
          description: d.description,
        })),
      },
    );
    const err = new Error(
      data?.message ||
        data?.details?.[0]?.description ||
        "Failed to confirm payment source with PayPal",
    ) as any;
    err.debugId = debugId;
    err.status = response.status;
    err.details = data?.details;
    throw err;
  }

  return data;
}

/**
 * Validates Apple Pay merchant session using backend Apple Merchant Identity cert if configured,
 * or returns sandbox/proxy response for testing.
 */
export async function validateApplePayMerchantSession(validationUrl: string, domainName?: string) {
  // Validate that the validation URL belongs to Apple
  try {
    const parsed = new URL(validationUrl);
    if (!parsed.hostname.endsWith(".apple.com")) {
      throw new Error("Invalid Apple Pay validation URL domain.");
    }
  } catch (err: any) {
    throw new Error(err.message || "Invalid validation URL.");
  }

  const cert = process.env.APPLE_PAY_CERTIFICATE;
  const key = process.env.APPLE_PAY_PRIVATE_KEY;
  const merchantIdentifier =
    process.env.APPLE_PAY_MERCHANT_IDENTIFIER || "merchant.com.novixaretail";
  const displayName = "NOVIXA UK";
  const domain = domainName || process.env.NEXT_PUBLIC_APP_DOMAIN || "www.novixaretail.com";

  if (cert && key) {
    const https = await import("node:https");
    const agent = new https.Agent({ cert, key });

    const response = await fetch(validationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantIdentifier,
        displayName,
        initiative: "web",
        initiativeContext: domain,
      }),
      // @ts-expect-error agent is node:https Agent
      agent,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Apple Pay validation failed: ${response.status} ${errText}`);
    }

    return await response.json();
  }

  // If running in development/sandbox without an Apple cert installed,
  // return a mock session object only in development/sandbox mode
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.PAYPAL_MODE?.toLowerCase() === "live";

  if (isProduction) {
    throw new Error(
      "Apple Pay production merchant certificates (APPLE_PAY_CERTIFICATE, APPLE_PAY_PRIVATE_KEY) are not configured.",
    );
  }

  return {
    epochTimestamp: Date.now(),
    expiresAt: Date.now() + 3600000,
    merchantSessionIdentifier: `SSH_${Date.now()}`,
    nonce: `NONCE_${Date.now()}`,
    merchantIdentifier,
    domainName: domain,
    displayName,
    signature: "NOVIXA_SANDBOX_MOCK_SIGNATURE",
  };
}

/**
 * Validates PayPal webhook notification signature using PayPal's verify-webhook-signature API.
 */
export async function verifyPayPalWebhookSignature(params: {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId: string;
  webhookEvent: any;
}): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: params.transmissionId,
        transmission_time: params.transmissionTime,
        cert_url: params.certUrl,
        auth_algo: params.authAlgo,
        transmission_sig: params.transmissionSig,
        webhook_id: params.webhookId,
        webhook_event: params.webhookEvent,
      }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.verification_status === "SUCCESS";
  } catch (err) {
    console.error("PayPal webhook signature verification failed:", err);
    return false;
  }
}

/**
 * Initiates a refund for an authorized captured payment via PayPal Payments v2 API.
 */
export async function refundPayPalCapture(
  captureId: string,
  amount?: number,
  currency: string = "GBP",
) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const payload: Record<string, any> = {};
  if (amount !== undefined && amount > 0) {
    payload.amount = {
      value: amount.toFixed(2),
      currency_code: currency,
    };
  }

  const response = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  const debugId = response.headers.get("Paypal-Debug-Id") || data?.debug_id;

  if (!response.ok) {
    console.error(`PayPal Refund Error [captureId: ${captureId}, debug_id: ${debugId}]:`, data);
    const err = new Error(
      data?.message || data?.details?.[0]?.description || "Failed to process refund with PayPal",
    ) as any;
    err.debugId = debugId;
    err.status = response.status;
    err.details = data?.details;
    throw err;
  }

  return data;
}
