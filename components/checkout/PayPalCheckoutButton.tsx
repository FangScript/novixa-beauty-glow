"use client";

import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PayPalCheckoutButtonProps {
  amount: number;
  currency?: string;
  items: Array<{ productId: string; quantity: number; price?: number }>;
  couponCode?: string;
  shippingMethodId?: string;
  validateBeforePayment: () => boolean;
  onSuccess: (paymentResult: {
    paypalOrderId: string;
    captureId?: string;
    payerEmail?: string;
  }) => Promise<void>;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function PayPalCheckoutButton({
  amount,
  currency = "GBP",
  items,
  couponCode,
  shippingMethodId,
  validateBeforePayment,
  onSuccess,
  onError,
  disabled = false,
}: PayPalCheckoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const clientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "AbwQhpax7GQDFjlF1xNlZVYQCPY10_5YW-EFo09_35nZiOMQkviu2Dr-xsM5GT_gDGRECdSCutJMw_4x";

  const handleCreateOrder = async (): Promise<string> => {
    if (!validateBeforePayment()) {
      throw new Error("Validation failed. Please review your address details.");
    }

    try {
      const response = await fetch("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: couponCode || undefined,
          shippingMethodId: shippingMethodId || undefined,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.id) {
        throw new Error(data.error || "Failed to initialize PayPal order");
      }

      return data.id;
    } catch (err: any) {
      console.error("Error creating PayPal order:", err);
      toast.error(err.message || "Failed to connect to PayPal");
      throw err;
    }
  };

  const handleApprove = async (data: any) => {
    setIsProcessing(true);
    try {
      // Capture the payment on server
      const captureResponse = await fetch("/api/payments/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paypalOrderId: data.orderID,
        }),
      });

      const captureResult = await captureResponse.json();

      if (!captureResponse.ok || !captureResult.ok) {
        throw new Error(captureResult.error || "Failed to capture payment with PayPal.");
      }

      // Delegate final order database commit to parent
      await onSuccess({
        paypalOrderId: data.orderID,
        captureId: captureResult.captureId,
        payerEmail: captureResult.payerEmail,
      });
    } catch (err: any) {
      console.error("PayPal Capture error:", err);
      const msg = err.message || "Unable to finalize PayPal payment.";
      toast.error(msg);
      onError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-3 pt-2">
      {initError && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 border border-rose-200">
          <AlertCircle size={14} />
          <span>{initError}</span>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 p-4 text-xs font-medium text-stone-700 bg-stone-50 border border-stone-200">
          <Loader2 size={16} className="animate-spin text-rosewood" />
          <span>Securing your PayPal payment & placing order...</span>
        </div>
      )}

      <div className={isProcessing || disabled ? "pointer-events-none opacity-50" : ""}>
        <PayPalScriptProvider
          options={{
            clientId,
            currency,
            intent: "capture",
            components: "buttons",
            enableFunding: "venmo,paylater",
          }}
        >
          <PayPalButtons
            style={{
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
              height: 46,
            }}
            disabled={disabled || isProcessing}
            createOrder={handleCreateOrder}
            onApprove={handleApprove}
            onError={(err: any) => {
              console.error("PayPal SDK Button Error:", err);
              const errMsg = "PayPal authorization encountered an issue. Please try again.";
              setInitError(errMsg);
              toast.error(errMsg);
              onError?.(errMsg);
            }}
            onCancel={() => {
              toast.info("PayPal payment was cancelled. Your shopping bag is preserved.");
            }}
          />
        </PayPalScriptProvider>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={13} className="text-emerald-700" />
        <span>Protected by PayPal Buyer Protection & SSL Encryption</span>
      </div>
    </div>
  );
}
