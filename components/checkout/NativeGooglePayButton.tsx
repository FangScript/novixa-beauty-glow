"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { publicPaymentConfig } from "@/lib/payments/public-config";
import {
  authorizeGooglePayOrder,
  googlePayCustomerMessage,
  googlePayErrorDetails,
  resolveGooglePayConfig,
  type PayPalGooglePayHelper,
  type ResolvedGooglePayConfig,
} from "@/lib/payments/googlepay";
import {
  loadWalletScript,
  validatePayPalGooglePayScript,
  withWalletTimeout,
} from "@/lib/payments/wallet-script";

interface NativeGooglePayButtonProps {
  amount: number;
  currency?: string;
  items: Array<{ productId: string; quantity: number; price?: number }>;
  couponCode?: string;
  shippingMethodId?: string;
  shippingAddress?: {
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  validateBeforePayment: () => boolean;
  onSuccess: (paymentResult: {
    paypalOrderId: string;
    captureId?: string;
    payerEmail?: string;
  }) => Promise<void>;
  onError?: (error: string) => void;
  onAvailabilityChange?: (available: boolean) => void;
  disabled?: boolean;
}

interface GooglePaymentsClient {
  isReadyToPay(request: unknown): Promise<{ result: boolean }>;
  loadPaymentData(request: unknown): Promise<{ paymentMethodData: unknown; email?: string }>;
  createButton(options: {
    onClick: () => void;
    buttonColor: string;
    buttonType: string;
    buttonSizeMode: string;
  }): HTMLElement;
}

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (options: {
            environment: "TEST" | "PRODUCTION";
            merchantInfo?: { merchantId?: string; merchantName?: string };
          }) => GooglePaymentsClient;
        };
      };
    };
  }
}

function getPayPalGooglePay() {
  const paypal = window.paypal as unknown as { Googlepay?: () => PayPalGooglePayHelper };
  return paypal?.Googlepay?.();
}

async function paymentRequest(path: string, body: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Google Pay payment request failed.");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function NativeGooglePayButton({
  amount,
  currency = "GBP",
  items,
  couponCode,
  shippingMethodId,
  shippingAddress,
  validateBeforePayment,
  onSuccess,
  onError,
  onAvailabilityChange,
  disabled = false,
}: NativeGooglePayButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{
    client: GooglePaymentsClient;
    helper: PayPalGooglePayHelper;
    config: ResolvedGooglePayConfig;
  } | null>(null);
  const processingRef = useRef(false);
  const availabilityRef = useRef(onAvailabilityChange);
  const [isReadyToPay, setIsReadyToPay] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    availabilityRef.current = onAvailabilityChange;
  }, [onAvailabilityChange]);

  useEffect(() => {
    let cancelled = false;
    runtimeRef.current = null;
    setIsReadyToPay(null);
    setErrorMessage(null);
    let publicSettings: ReturnType<typeof publicPaymentConfig> | undefined;
    const initialize = async () => {
      if (window.location.hostname === "novixaretail.com") {
        window.location.replace(
          "https://www.novixaretail.com" + window.location.pathname + window.location.search,
        );
        return;
      }
      const settingsResponse = await fetch("/api/payments/config", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!settingsResponse.ok) throw new Error("Server payment configuration is unavailable.");
      publicSettings = await settingsResponse.json();
      if (cancelled) return;
      if (!publicSettings) throw new Error("Server returned no payment configuration.");
      const {
        paypalClientId: clientId,
        paypalMode,
        googlePayEnvironment: environment,
        googlePayMerchantId: merchantId,
      } = publicSettings;
      if (!clientId) throw new Error("PayPal client ID is missing.");
      const sdkParams = new URLSearchParams({
        "client-id": clientId,
        currency,
        intent: "capture",
        components: "buttons,googlepay,applepay",
      });
      await Promise.all([
        loadWalletScript({
          src: "https://pay.google.com/gp/p/js/pay.js",
          isReady: () => Boolean(window.google?.payments?.api?.PaymentsClient),
        }),
        loadWalletScript({
          src: "https://www.paypal.com/sdk/js?" + sdkParams,
          isReady: () => Boolean(getPayPalGooglePay()),
          validateExisting: (src) => validatePayPalGooglePayScript(src, clientId, currency),
        }),
      ]);
      if (cancelled) return;
      const helper = getPayPalGooglePay();
      const PaymentsClient = window.google?.payments?.api?.PaymentsClient;
      if (!helper || !PaymentsClient) throw new Error("Google Pay SDK is unavailable.");
      const sdkConfig = await withWalletTimeout(
        helper.config(),
        "PayPal Google Pay configuration timed out.",
      );
      if (cancelled) return;
      const config = resolveGooglePayConfig(sdkConfig, {
        environment,
        merchantId,
        paypalMode,
        clientId,
        origin: window.location.origin,
      });
      console.info("[NOVIXA Google Pay] configuration", config.diagnostics);
      const client = new PaymentsClient({
        environment: config.environment,
        merchantInfo: config.merchantInfo,
      });
      const ready = await withWalletTimeout(
        client.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: config.allowedPaymentMethods.map(({ type, parameters }) => ({
            type,
            parameters,
          })),
        }),
        "Google Pay readiness check timed out.",
      );
      if (cancelled) return;
      runtimeRef.current = ready.result ? { client, helper, config } : null;
      setIsReadyToPay(Boolean(ready.result));
      availabilityRef.current?.(Boolean(ready.result));
    };
    initialize().catch((error: unknown) => {
      if (cancelled) return;
      // Whitelist public identifiers and error fields; never log wallet/customer payloads.
      console.error("[NOVIXA Google Pay] initialization failed", {
        origin: window.location.origin,
        ...publicSettings,
        ...googlePayErrorDetails(error),
      });
      setIsReadyToPay(false);
      setErrorMessage(googlePayCustomerMessage(error));
      availabilityRef.current?.(false);
    });
    return () => {
      cancelled = true;
      runtimeRef.current = null;
    };
  }, [currency]);

  const handlePayment = useCallback(async () => {
    if (disabled || processingRef.current || !validateBeforePayment()) return;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Please review your order total before paying.");
      return;
    }
    processingRef.current = true;
    setIsProcessing(true);
    setErrorMessage(null);
    let stage = "payment-sheet";
    try {
      console.info("[NOVIXA Google Pay] payment-sheet request", runtime.config.diagnostics);
      // No network await before loadPaymentData: preserve the user's click activation.
      const paymentData = await runtime.client.loadPaymentData({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: runtime.config.allowedPaymentMethods,
        merchantInfo: runtime.config.merchantInfo,
        transactionInfo: {
          totalPriceStatus: "FINAL",
          totalPrice: amount.toFixed(2),
          currencyCode: currency,
          countryCode: "GB",
        },
      });
      stage = "create-order";
      // A merchant error or cancellation no longer creates an abandoned PayPal order.
      const order = await paymentRequest("/api/payments/paypal/create-order", {
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        couponCode,
        shippingMethodId,
        shippingAddress: shippingAddress?.addressLine1 ? shippingAddress : undefined,
        currency,
        paymentSource: "google_pay",
      });
      if (!order.id) throw new Error("PayPal did not return an order ID.");
      if (
        !Number.isFinite(Number(order.amount)) ||
        Math.abs(Number(order.amount) - amount) > 0.005
      ) {
        throw new Error("The order total changed. Review your order before retrying Google Pay.");
      }
      stage = "authorization";
      await authorizeGooglePayOrder(
        runtime.helper,
        order.id,
        paymentData.paymentMethodData,
        async () => {
          stage = "capture";
          // PayPal's JS SDK owns token confirmation. Only an order ID goes to our server.
          const capture = await paymentRequest("/api/wallets/googlepay-confirm", {
            paypalOrderId: order.id,
          });
          if (!capture.ok) throw new Error("Google Pay capture has not completed.");
          stage = "finalize-order";
          await onSuccess({
            paypalOrderId: order.id,
            captureId: capture.captureId,
            payerEmail: capture.payerEmail || paymentData.email,
          });
        },
      );
    } catch (error: unknown) {
      const details = googlePayErrorDetails(error);
      if (details.cancelled) {
        toast.info("Google Pay was cancelled. Your shopping bag is preserved.");
      } else {
        console.error("[NOVIXA Google Pay] checkout failed", {
          stage,
          ...runtime.config.diagnostics,
          ...details,
        });
        const message =
          stage === "finalize-order" || stage === "capture"
            ? "Payment confirmation needs checking. Please contact support before trying another payment."
            : googlePayCustomerMessage(error);
        setErrorMessage(message);
        toast.error(message);
        onError?.(message);
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [
    disabled,
    validateBeforePayment,
    amount,
    currency,
    items,
    couponCode,
    shippingMethodId,
    shippingAddress,
    onSuccess,
    onError,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    const runtime = runtimeRef.current;
    if (!container || !isReadyToPay || !runtime) return;
    container.replaceChildren();
    try {
      const button = runtime.client.createButton({
        onClick: () => void handlePayment(),
        buttonColor: "black",
        buttonType: "buy",
        buttonSizeMode: "fill",
      });
      button.style.width = "100%";
      button.style.minHeight = "48px";
      container.appendChild(button);
    } catch (error) {
      console.error("[NOVIXA Google Pay] button failed", googlePayErrorDetails(error));
      setErrorMessage(googlePayCustomerMessage(error));
    }
    return () => container.replaceChildren();
  }, [isReadyToPay, handlePayment]);

  return (
    <div className="w-full max-w-full space-y-3 pt-2">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 border border-rose-200"
        >
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}
      {isProcessing && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 p-4 text-xs font-medium text-stone-700 bg-stone-50 border border-stone-200"
        >
          <Loader2 size={16} className="animate-spin text-rosewood" />
          <span>Processing your Google Pay payment...</span>
        </div>
      )}
      {isReadyToPay === false && !errorMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Google Pay is not available for this checkout. Please select Card or PayPal.
        </div>
      )}
      {isReadyToPay === null && (
        <div role="status" className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-rosewood" />
          <span className="ml-2 text-xs text-muted-foreground">Initializing Google Pay...</span>
        </div>
      )}
      <div
        ref={containerRef}
        aria-busy={isProcessing}
        className={
          "w-full min-h-[48px] " +
          (isProcessing || disabled || isReadyToPay !== true
            ? "pointer-events-none opacity-50"
            : "")
        }
      />
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={13} className="text-emerald-700" />
        <span>Secure checkout with Google Pay · Processed by PayPal</span>
      </div>
    </div>
  );
}
