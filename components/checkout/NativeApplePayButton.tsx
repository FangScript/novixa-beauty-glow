"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NativeApplePayButtonProps {
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
  disabled?: boolean;
}

/**
 * Strict device & browser capability test for Apple Pay.
 * MUST return false on Windows, Android, Chrome, Edge, and Firefox.
 */
export function checkApplePaySupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ApplePaySession = (window as any).ApplePaySession;
    return Boolean(ApplePaySession && ApplePaySession.canMakePayments && ApplePaySession.canMakePayments());
  } catch {
    return false;
  }
}

export function NativeApplePayButton({
  amount,
  currency = "GBP",
  items,
  couponCode,
  shippingMethodId,
  shippingAddress,
  validateBeforePayment,
  onSuccess,
  onError,
  disabled = false,
}: NativeApplePayButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Proactively preload PayPal SDK with applepay component if not already present
    if (typeof window !== "undefined" && !(window as any).paypal?.Applepay) {
      const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      if (clientId && !document.querySelector('script[src*="paypal.com/sdk/js"][src*="applepay"]')) {
        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&components=applepay,buttons`;
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [currency]);

  const handleApplePayClick = async () => {
    setErrorMessage(null);

    if (!validateBeforePayment()) {
      return;
    }

    const ApplePaySession = (window as any).ApplePaySession;
    if (!ApplePaySession || !ApplePaySession.canMakePayments()) {
      const msg = "Apple Pay is not supported on this browser. Please use Safari on an iOS or macOS device.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create PayPal Order on our backend first
      const orderRes = await fetch("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: couponCode || undefined,
          shippingMethodId: shippingMethodId || undefined,
          shippingAddress: shippingAddress?.addressLine1 ? shippingAddress : undefined,
          currency,
          paymentSource: "apple_pay",
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.id) {
        throw new Error(orderData.error || "Failed to initialize order for Apple Pay.");
      }

      const paypalOrderId = orderData.id;

      // 2. Build Apple Pay Payment Request
      const paymentRequest = {
        countryCode: "GB",
        currencyCode: currency,
        merchantCapabilities: ["supports3DS"],
        supportedNetworks: ["visa", "masterCard", "amex", "discover"],
        total: {
          label: "NOVIXA UK",
          amount: amount.toFixed(2),
          type: "final",
        },
      };

      const session = new ApplePaySession(3, paymentRequest);

      const getApplePayHelper = async (): Promise<any | null> => {
        if (typeof window === "undefined") return null;
        if ((window as any).paypal?.Applepay) {
          return (window as any).paypal.Applepay();
        }
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 100));
          if ((window as any).paypal?.Applepay) {
            return (window as any).paypal.Applepay();
          }
        }
        return null;
      };

      // 3. Handle Merchant Validation
      session.onvalidatemerchant = async (event: any) => {
        try {
          // If PayPal SDK exposes window.paypal.Applepay, use it; otherwise proxy to server
          const applepayHelper = await getApplePayHelper();
          if (applepayHelper) {
            try {
              const res = await applepayHelper.validateMerchant({
                validationUrl: event.validationURL,
                displayName: "Novixa Beauty & Glow",
              });
              const merchantSession = res?.merchantSession || res;
              session.completeMerchantValidation(merchantSession);
              return;
            } catch (sdkErr) {
              console.warn("PayPal SDK client validateMerchant notice, falling back to server:", sdkErr);
            }
          }

          // Server-side merchant validation proxy
          const validateRes = await fetch("/api/wallets/applepay-validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validationUrl: event.validationURL }),
          });

          const validateData = await validateRes.json();
          if (!validateRes.ok || !validateData.merchantSession) {
            throw new Error(validateData.error || "Merchant validation failed with Apple.");
          }

          session.completeMerchantValidation(validateData.merchantSession);
        } catch (err: any) {
          console.error("Apple Pay validation error:", err);
          session.abort();
          setIsProcessing(false);
          const msg = err.message || "Failed to validate Apple Pay merchant.";
          setErrorMessage(msg);
          toast.error(msg);
        }
      };

      // 4. Handle Payment Authorization
      session.onpaymentauthorized = async (event: any) => {
        try {
          const payment = event.payment;

          // Attempt client-side PayPal confirmation if SDK helper is loaded
          const applepayHelper = await getApplePayHelper();
          if (applepayHelper) {
            try {
              await applepayHelper.confirmOrder({
                orderId: paypalOrderId,
                token: payment.token,
                billingContact: payment.billingContact,
                shippingContact: payment.shippingContact,
              });
            } catch (sdkConfirmErr) {
              console.warn("Client confirmOrder notice, falling back to backend capture:", sdkConfirmErr);
            }
          }

          // Capture on backend via PayPal Orders v2
          const captureRes = await fetch("/api/payments/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paypalOrderId,
              applePayPayment: {
                id: payment.token?.transactionIdentifier,
                token: payment.token,
              },
            }),
          });

          const captureResult = await captureRes.json();
          if (!captureRes.ok || !captureResult.ok) {
            throw new Error(captureResult.error || "Failed to capture Apple Pay payment with PayPal.");
          }

          session.completePayment(ApplePaySession.STATUS_SUCCESS);

          // Finalize store order
          await onSuccess({
            paypalOrderId,
            captureId: captureResult.captureId,
            payerEmail: payment.shippingContact?.emailAddress || captureResult.payerEmail,
          });
        } catch (authErr: any) {
          console.error("Apple Pay payment authorization error:", authErr);
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          const msg = authErr.message || "Apple Pay payment failed.";
          setErrorMessage(msg);
          toast.error(msg);
          onError?.(msg);
        } finally {
          setIsProcessing(false);
        }
      };

      session.oncancel = () => {
        setIsProcessing(false);
        toast.info("Apple Pay authorization was cancelled.");
      };

      // 5. Present native Apple Pay sheet
      session.begin();
    } catch (err: any) {
      setIsProcessing(false);
      console.error("Apple Pay session error:", err);
      const msg = err.message || "Could not start Apple Pay session.";
      setErrorMessage(msg);
      toast.error(msg);
      onError?.(msg);
    }
  };

  return (
    <div className="w-full max-w-full space-y-3 pt-2">
      {errorMessage && (
        <div className="flex items-start gap-2.5 text-xs text-rose-800 bg-rose-50/90 p-3.5 border border-rose-200/80 rounded-lg">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold text-rose-900">Payment Notice</p>
            <p className="mt-0.5 leading-relaxed text-rose-700">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-600 text-xs font-semibold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2.5 p-4 text-xs font-medium text-stone-800 bg-stone-50 border border-stone-200 rounded-lg">
          <Loader2 size={16} className="animate-spin text-rosewood" />
          <span>Authorizing via Apple Pay & Face ID / Touch ID...</span>
        </div>
      )}

      {/* Official Native Apple Pay Button */}
      <button
        type="button"
        disabled={disabled || isProcessing}
        onClick={handleApplePayClick}
        aria-label="Buy with Apple Pay"
        className={`w-full h-12 bg-black text-white rounded-lg cursor-pointer transition-all flex items-center justify-center text-sm font-medium hover:bg-neutral-900 active:scale-[0.99] shadow-xs apple-pay-native-button ${
          disabled || isProcessing ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {/* Rendered only when -apple-pay-button WebKit styling is not applied */}
        <span className="apple-pay-button-content inline-flex items-center justify-center gap-2 font-medium tracking-wide text-white">
          <span className="text-sm font-medium">Buy with</span>
          <svg className="h-4.5 w-auto fill-current mb-0.5" viewBox="0 0 170 170" aria-hidden="true">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.96-14.42-6.53-10.01-11.59-20.91-15.19-32.69-3.59-11.78-5.39-22.95-5.39-33.51 0-14.15 3.48-26.04 10.45-35.69 6.97-9.64 15.89-14.53 26.77-14.65 5.66 0 11.54 1.41 17.63 4.24 6.09 2.83 10.13 4.3 12.11 4.41 1.63 0 5.88-1.52 12.74-4.58 6.86-3.05 12.74-4.46 17.64-4.24 13.5.65 24.28 5.76 32.32 15.34-11.75 7.07-17.52 16.75-17.3 29.04.22 9.57 3.86 17.68 10.94 24.32 7.07 6.64 15.34 10.44 24.8 11.42-2.39 7.4-5.11 14.58-8.16 21.54zM119.22 33.15c0-7.29 2.61-14.19 7.84-20.67 5.22-6.49 11.75-10.66 19.58-12.48.22 1.09.33 2.18.33 3.26 0 7.29-2.67 14.2-8.01 20.73-5.33 6.53-11.91 10.61-19.74 12.24 0-1.09 0-2.07 0-3.08z" />
          </svg>
          <span className="text-base font-semibold tracking-normal font-sans">Pay</span>
        </span>
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
        <ShieldCheck size={13} className="text-emerald-700" />
        <span>One-touch Touch ID / Face ID payment · Processed by PayPal</span>
      </div>
    </div>
  );
}
