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
  return (
    process.env.PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    ""
  );
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
  items?: Array<{
    name: string;
    unitAmount: number;
    quantity: number;
    sku?: string;
  }>;
}

/**
 * Creates a new PayPal v2 order for capture.
 */
export async function createPayPalOrder(params: CreateOrderParams) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();
  const currency = params.currency || "GBP";
  const formattedAmount = params.amount.toFixed(2);

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
    application_context: {
      brand_name: "Novixa Beauty & Glow",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
    },
  };

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
    console.error("PayPal Create Order Error:", data);
    throw new Error(data.message || data.details?.[0]?.description || "Failed to create PayPal order");
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

  if (!response.ok) {
    console.error("PayPal Capture Order Error:", data);
    throw new Error(data.message || data.details?.[0]?.description || "Failed to capture PayPal payment");
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
