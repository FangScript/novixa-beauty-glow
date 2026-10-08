"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (options: { environment: "TEST" | "PRODUCTION" }) => any;
        };
      };
    };
  }
}

const GPAY_SCRIPT_URL = "https://pay.google.com/gp/p/js/pay.js";

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
  const paymentsClientRef = useRef<any>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isReadyToPay, setIsReadyToPay] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "BAAi8QOljyA26-sCFX-3M0WIYmJk_qm16xSH4wVblfWVIv_-NFY7GvGAIw9f6D5-A8CtcHPlUOhDpXXxGs";

  // Google Pay must run in TEST environment until Google approves the merchant profile
  // in the Google Pay & Wallet Console. Setting environment to PRODUCTION before Google approval
  // triggers [OR_BIBED_11] ("Merchant trouble accepting payments").
  const googlePayEnv: "TEST" | "PRODUCTION" =
    process.env.NEXT_PUBLIC_GOOGLE_PAY_ENV === "PRODUCTION" ? "PRODUCTION" : "TEST";

  // Step 1: Dynamically load the Google Pay Web SDK script
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.payments?.api?.PaymentsClient) {
      setIsSdkLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${GPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsSdkLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = GPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => {
      console.warn("Failed to load Google Pay SDK.");
      setIsReadyToPay(false);
      onAvailabilityChange?.(false);
    };
    document.head.appendChild(script);
  }, [onAvailabilityChange]);

  // Step 2: Initialize PaymentsClient and verify isReadyToPay with PayPal tokenization
  useEffect(() => {
    if (
      !isSdkLoaded ||
      typeof window === "undefined" ||
      !window.google?.payments?.api?.PaymentsClient
    ) {
      return;
    }

    try {
      const client = new window.google.payments.api.PaymentsClient({
        environment: googlePayEnv,
      });
      paymentsClientRef.current = client;

      // Base card payment method for isReadyToPay check
      const isReadyToPayRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: "CARD",
            parameters: {
              allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
              allowedCardNetworks: ["MASTERCARD", "VISA", "AMEX", "DISCOVER"],
            },
            tokenizationSpecification: {
              type: "PAYMENT_GATEWAY",
              parameters: {
                gateway: "paypalppcp",
                gatewayMerchantId: clientId,
                "paypal:clientId": clientId,
              },
            },
          },
        ],
      };

      client
        .isReadyToPay(isReadyToPayRequest)
        .then((response: { result: boolean }) => {
          const ready = Boolean(response?.result);
          setIsReadyToPay(ready);
          onAvailabilityChange?.(ready);
        })
        .catch((err: any) => {
          console.warn("Google Pay isReadyToPay check error:", err);
          setIsReadyToPay(false);
          onAvailabilityChange?.(false);
        });
    } catch (err: any) {
      console.warn("Google PaymentsClient initialization error:", err);
      setIsReadyToPay(false);
      onAvailabilityChange?.(false);
    }
  }, [isSdkLoaded, googlePayEnv, clientId, onAvailabilityChange]);

  // Step 3: Handle native payment sheet presentation and capture
  const handlePayment = useCallback(async () => {
    setErrorMessage(null);

    if (!validateBeforePayment()) {
      return;
    }

    if (!paymentsClientRef.current) {
      toast.error("Google Pay is not initialized yet. Please try again.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Prepare payment data request with official parameters
      let allowedPaymentMethods: any[] = [
        {
          type: "CARD",
          parameters: {
            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
            allowedCardNetworks: ["MASTERCARD", "VISA", "AMEX", "DISCOVER"],
            billingAddressRequired: true,
            billingAddressParameters: {
              format: "FULL",
            },
          },
          tokenizationSpecification: {
            type: "PAYMENT_GATEWAY",
            parameters: {
              gateway: "paypalppcp",
              gatewayMerchantId: clientId,
              "paypal:clientId": clientId,
            },
          },
        },
      ];

      if (typeof window !== "undefined" && (window as any).paypal?.Googlepay) {
        try {
          const ppConfig = await (window as any).paypal.Googlepay().config();
          if (ppConfig?.allowedPaymentMethods && ppConfig.allowedPaymentMethods.length > 0) {
            allowedPaymentMethods = ppConfig.allowedPaymentMethods;
          }
        } catch (sdkConfigErr) {
          console.warn("paypal.Googlepay().config() notice:", sdkConfigErr);
        }
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://www.novixaretail.com";
      const gpayMerchantId = process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || "BCR2DN6D5L703ZKP";

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods,
        transactionInfo: {
          totalPriceStatus: "FINAL",
          totalPrice: amount.toFixed(2),
          currencyCode: currency,
          countryCode: "GB",
        },
        merchantInfo:
          googlePayEnv === "PRODUCTION"
            ? {
                merchantId: gpayMerchantId,
                merchantName: "NOVIXA UK",
                merchantOrigin: origin,
              }
            : {
                merchantName: "NOVIXA UK",
              },
      };

      // 2. Start server-authoritative PayPal order creation in parallel
      const orderPromise = fetch("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: couponCode || undefined,
          shippingMethodId: shippingMethodId || undefined,
          shippingAddress: shippingAddress?.addressLine1 ? shippingAddress : undefined,
          currency,
          paymentSource: "google_pay",
        }),
      }).then(async (orderRes) => {
        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.id) {
          throw new Error(orderData.error || "Failed to initialize PayPal order for Google Pay.");
        }
        return orderData.id as string;
      });

      // 3. Immediately trigger Google Pay sheet to preserve user activation & prevent popup blockers
      const paymentData = await paymentsClientRef.current.loadPaymentData(paymentDataRequest);
      const paypalOrderId = await orderPromise;

      // Optional: Client-side SDK confirmation if available
      if (typeof window !== "undefined" && (window as any).paypal?.Googlepay) {
        try {
          await (window as any).paypal.Googlepay().confirmOrder({
            orderId: paypalOrderId,
            paymentMethodData: paymentData.paymentMethodData,
          });
        } catch (sdkConfirmErr: any) {
          console.warn(
            "paypal.Googlepay().confirmOrder notice:",
            sdkConfirmErr?.message || sdkConfirmErr,
          );
        }
      }

      // 3. Confirm payment source and capture through PayPal
      const confirmRes = await fetch("/api/wallets/googlepay-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paypalOrderId,
          paymentMethodData: paymentData.paymentMethodData,
        }),
      });

      const confirmResult = await confirmRes.json();
      if (!confirmRes.ok || !confirmResult.ok) {
        throw new Error(confirmResult.error || "Payment authorization with Google Pay failed.");
      }

      // 4. Finalize order in store
      await onSuccess({
        paypalOrderId,
        captureId: confirmResult.captureId,
        payerEmail: confirmResult.payerEmail || paymentData.email,
      });
    } catch (err: any) {
      if (err?.statusCode === "CANCELED" || err?.message?.includes("CANCELED")) {
        toast.info("Google Pay authorization was cancelled.");
      } else {
        console.error("Google Pay transaction error:", err);
        const msg = err.message || "Failed to complete Google Pay checkout.";
        setErrorMessage(msg);
        toast.error(msg);
        onError?.(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    validateBeforePayment,
    items,
    couponCode,
    shippingMethodId,
    shippingAddress,
    currency,
    clientId,
    amount,
    onSuccess,
    onError,
  ]);

  // Step 4: Mount the official Google Pay button inside containerRef
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isReadyToPay || !paymentsClientRef.current) return;

    // Clear previous children
    container.innerHTML = "";

    try {
      const button = paymentsClientRef.current.createButton({
        onClick: handlePayment,
        buttonColor: "black",
        buttonType: "buy",
        buttonSizeMode: "fill",
      });

      button.style.width = "100%";
      button.style.minHeight = "48px";

      container.appendChild(button);
    } catch (err) {
      console.warn("Failed to create Google Pay button:", err);
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [isReadyToPay, handlePayment]);

  return (
    <div className="w-full max-w-full space-y-3 pt-2">
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 border border-rose-200">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 p-4 text-xs font-medium text-stone-700 bg-stone-50 border border-stone-200">
          <Loader2 size={16} className="animate-spin text-rosewood" />
          <span>Processing your Google Pay authorization via PayPal...</span>
        </div>
      )}

      {isReadyToPay === false && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Google Pay is not available on this browser or no compatible card is configured. Please
          select Credit Card or PayPal above.
        </div>
      )}

      {isReadyToPay === null && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-rosewood" />
          <span className="ml-2 text-xs text-muted-foreground">Initializing Google Pay...</span>
        </div>
      )}

      {/* Official Native Google Pay Button Container */}
      <div
        ref={containerRef}
        className={`w-full min-h-[48px] ${
          isProcessing || disabled || isReadyToPay !== true ? "pointer-events-none opacity-50" : ""
        }`}
      />

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={13} className="text-emerald-700" />
        <span>Biometrically protected with Google Pay · Processed by PayPal</span>
      </div>
    </div>
  );
}
