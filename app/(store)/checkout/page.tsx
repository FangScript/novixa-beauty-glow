"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  PackageCheck,
  Tag,
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  Smartphone,
  Banknote,
  Sparkles,
  Info,
  Check,
  Truck,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import { PayPalCheckoutButton } from "@/components/checkout/PayPalCheckoutButton";

export type ShippingOption = {
  id: string;
  name: string;
  timeframe: string;
  price: number;
  description?: string | null;
  isDefault: boolean;
};

const DEFAULT_SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "sm-normal",
    name: "Normal Delivery",
    timeframe: "3-5 days",
    price: 0.20,
    description: "Standard tracked courier delivery within 3-5 business days.",
    isDefault: true,
  },
  {
    id: "sm-express",
    name: "Express Delivery",
    timeframe: "1-3 days",
    price: 0.30,
    description: "Priority expedited courier dispatch with 1-3 business days delivery.",
    isDefault: false,
  },
];

type AppliedCoupon = {
  id?: string;
  code: string;
  discount: number;
  message: string;
};

type PaymentMethodType =
  "CARD" | "PAYPAL" | "GOOGLE_PAY" | "APPLE_PAY" | "KLARNA" | "BANK_TRANSFER" | "COD";

export default function CheckoutPage() {
  const { cart, subtotal, clearCart, isCartLoading } = useCommerce();
  const { user } = useCustomerAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Customer & Shipping
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
  });

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("CARD");
  const [cardData, setCardData] = useState({
    name: "",
    number: "",
    expMonth: "",
    expYear: "",
    cvc: "",
  });

  // Device Apple Pay capability detection
  const [hasApplePay, setHasApplePay] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isApplePayAvailable =
        Boolean((window as any).ApplePaySession) &&
        Boolean((window as any).ApplePaySession?.canMakePayments?.());
      setHasApplePay(isApplePayAvailable);
    }
  }, []);

  // Pre-fill from authenticated user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
      setCardData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
      }));
    }
  }, [user]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid coupon code.");
      }

      setAppliedCoupon({
        id: data.coupon?.id,
        code: data.coupon.code,
        discount: data.discount,
        message: data.message,
      });
      setCouponCode("");
      toast.success(`Coupon ${data.coupon.code} applied! Saved ${formatPrice(data.discount)}`);
    } catch (err: any) {
      setCouponError(err.message || "Failed to apply coupon.");
      toast.error(err.message || "Failed to apply coupon.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    toast.info("Promotional code removed");
  };

  // Shipping Methods Selection
  const [shippingMethods, setShippingMethods] = useState<ShippingOption[]>(DEFAULT_SHIPPING_OPTIONS);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingOption>(DEFAULT_SHIPPING_OPTIONS[0]);
  const [isLoadingShipping, setIsLoadingShipping] = useState(true);

  useEffect(() => {
    fetch("/api/shipping-methods")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.methods) && data.methods.length > 0) {
          setShippingMethods(data.methods);
          const defaultOpt = data.methods.find((m: any) => m.isDefault) || data.methods[0];
          setSelectedShippingMethod(defaultOpt);
        }
      })
      .catch((err) => console.warn("Failed to load shipping methods:", err))
      .finally(() => setIsLoadingShipping(false));
  }, []);

  const discount = appliedCoupon?.discount ?? 0;
  const shippingCharge = selectedShippingMethod ? selectedShippingMethod.price : 0.20;
  const orderTotal = Math.max(0, Math.round((Math.max(0, subtotal - discount) + shippingCharge) * 100) / 100);

  // Format card number with spaces (4 4 4 4)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardData({ ...cardData, number: formatted });
  };

  // Card brand detection
  const detectedCardBrand = useMemo(() => {
    const clean = cardData.number.replace(/\s+/g, "");
    if (/^4/.test(clean)) return "Visa";
    if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
    if (/^3[47]/.test(clean)) return "American Express";
    if (/^6(011|5)/.test(clean)) return "Discover";
    return null;
  }, [cardData.number]);

  const validateAddressForm = (): boolean => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please enter your name and email address.");
      return false;
    }
    if (!formData.address.trim() || !formData.city.trim() || !formData.pinCode.trim()) {
      toast.error("Please complete your delivery street address, city, and postal code.");
      return false;
    }
    return true;
  };

  const submitOrderWithDetails = async (
    method: PaymentMethodType,
    customPaymentDetails?: any,
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          userId: user?.id ?? null,
          couponCode: appliedCoupon?.code ?? null,
          shippingMethodId: selectedShippingMethod?.id,
          shippingMethodName: selectedShippingMethod?.name,
          shipping: shippingCharge,
          customer: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
          },
          address: {
            line1: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postalCode: formData.pinCode.trim(),
            country: "GB",
          },
          paymentMethod: method,
          paymentDetails:
            customPaymentDetails ||
            (method === "CARD"
              ? {
                  cardholderName: cardData.name.trim() || formData.name.trim(),
                  cardNumber: cardData.number.replace(/\s+/g, ""),
                  expMonth: cardData.expMonth.trim(),
                  expYear: cardData.expYear.trim(),
                  cvc: cardData.cvc.trim(),
                }
              : method === "BANK_TRANSFER"
                ? {
                    bankReference: `NVX-${Date.now().toString().slice(-6)}`,
                  }
                : method === "PAYPAL"
                  ? {
                      payerEmail: formData.email.trim(),
                    }
                  : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "Failed to process payment. Your shopping bag has been preserved.",
        );
      }

      // Save customer email and placed order for local history sync
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("novixa_customer_email", formData.email.trim());
          const existing = JSON.parse(localStorage.getItem("novixa_recent_orders") || "[]");
          localStorage.setItem(
            "novixa_recent_orders",
            JSON.stringify([data.order, ...existing].slice(0, 20)),
          );
        } catch {}
      }

      setConfirmedOrder(data.order);
      clearCart();
      setSubmitted(true);
      toast.success(`Order ${data.order.orderNumber} placed successfully!`);
    } catch (err: any) {
      const msg = err.message || "Unable to place order. Please review your details and try again.";
      setErrorMessage(msg);
      toast.error(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    if (paymentMethod === "PAYPAL") {
      toast.info("Please use the PayPal button below to complete checkout.");
      const paypalOption = document.getElementById("method-paypal");
      paypalOption?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Client-side quick card validation
    if (paymentMethod === "CARD") {
      const cleanNum = cardData.number.replace(/\s+/g, "");
      if (cleanNum.length < 13 || cleanNum.length > 19) {
        setErrorMessage("Please enter a valid card number (13-19 digits).");
        toast.error("Please enter a valid card number.");
        return;
      }
      if (!cardData.expMonth || !cardData.expYear) {
        setErrorMessage("Please enter valid card expiry month and year.");
        toast.error("Card expiry required.");
        return;
      }
      if (!cardData.cvc || cardData.cvc.length < 3) {
        setErrorMessage("Please enter a valid CVC / CVV security code.");
        toast.error("Security code required.");
        return;
      }
    }

    await submitOrderWithDetails(paymentMethod);
  };

  const methodDisplayNames: Record<PaymentMethodType, string> = {
    CARD: "Credit / Debit Card",
    PAYPAL: "PayPal Express",
    GOOGLE_PAY: "Google Pay",
    APPLE_PAY: "Apple Pay",
    KLARNA: "Klarna (Pay in 3 Installments)",
    BANK_TRANSFER: "Direct BACS Bank Transfer",
    COD: "Cash on Delivery",
  };

  if (isCartLoading && !cart.length && !submitted) {
    return (
      <PageShell title="Checkout">
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-rosewood" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Loading your shopping bag...
          </p>
        </div>
      </PageShell>
    );
  }

  if (!cart.length && !submitted) {
    return (
      <PageShell title="Checkout">
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">Your shopping bag is currently empty.</p>
          <Button asChild className="mt-6 rounded-none bg-ink text-white hover:bg-black">
            <Link href="/shop" className="text-xs uppercase tracking-wider">
              Return to shop
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  if (submitted && confirmedOrder) {
    const orderDiscount = confirmedOrder.discount ?? discount;
    const shipping = confirmedOrder.shipping ?? shippingCharge;
    const total = confirmedOrder.total ?? Math.max(0, subtotal - orderDiscount) + shipping;
    const primaryPayment = confirmedOrder.payments?.[0];
    const orderPayStatus = primaryPayment?.status || confirmedOrder.paymentStatus || "PENDING";
    const orderPayMethod = primaryPayment?.method || paymentMethod;

    return (
      <PageShell eyebrow="Order Confirmation" title="Thank You For Your Order">
        <div className="mt-8 max-w-2xl border border-border bg-white/70 p-8 sm:p-10 shadow-sm backdrop-blur-xs">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 size={30} className="text-emerald-700 shrink-0" />
            <div>
              <p className="font-display text-2xl text-foreground">Order Successfully Confirmed</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Order Reference:{" "}
                <strong className="text-foreground">{confirmedOrder.orderNumber}</strong>
              </p>
            </div>
          </div>

          {/* Payment Status Banner */}
          <div className="mt-6 rounded-none border border-border/80 bg-stone-50/80 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Payment Status:</span>
              <span
                className={`font-semibold uppercase tracking-wider px-2.5 py-0.5 text-[11px] ${
                  orderPayStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : orderPayStatus === "PROCESSING"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-stone-200 text-stone-800 border border-stone-300"
                }`}
              >
                {orderPayStatus}
              </span>
            </div>
            {primaryPayment?.providerPaymentId && (
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Transaction Ref:</span>
                <span className="text-foreground font-semibold">
                  {primaryPayment.providerPaymentId}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 border-y border-border py-6 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fulfillment Status</span>
              <span className="font-semibold text-rosewood uppercase tracking-wider">
                {confirmedOrder.status || "Pending"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="text-foreground font-medium">
                {methodDisplayNames[orderPayMethod as PaymentMethodType] || orderPayMethod}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Method</span>
              <span className="text-foreground font-medium">
                {confirmedOrder.shippingMethodName || selectedShippingMethod?.name || "Normal Delivery"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Recipient</span>
              <span className="text-foreground font-medium">
                {formData.name} ({formData.email})
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Shipping Destination</span>
              <span className="text-foreground text-right">
                {formData.address}, {formData.city}, {formData.state} - {formData.pinCode}
              </span>
            </div>
          </div>

          {/* Special Instructions for Bank Transfer & COD */}
          {orderPayMethod === "BANK_TRANSFER" && (
            <div className="mt-4 border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">BACS Bank Transfer Instructions:</p>
              <p>
                Account Name: <strong>Novixa Beauty Glow Ltd</strong>
              </p>
              <p>
                Bank: <strong>Barclays Bank UK</strong>
              </p>
              <p>
                Sort Code: <strong>20-00-00</strong> | Account: <strong>83920194</strong>
              </p>
              <p className="mt-1 font-mono text-[11px]">
                Payment Reference: <strong>{confirmedOrder.orderNumber}</strong>
              </p>
              <p className="text-[10px] text-amber-800/80 mt-1">
                Your order will be packaged and dispatched as soon as the wire transfer clears.
              </p>
            </div>
          )}

          {orderPayMethod === "COD" && (
            <div className="mt-4 border border-stone-200 bg-stone-50 p-3.5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Cash on Arrival:</p>
              <p className="text-[11px] mt-0.5">
                Please have exact amount {formatPrice(total)} ready for the courier during delivery.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(confirmedOrder.subtotal ?? subtotal)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-xs text-[#4b6742] font-medium">
                <span>Promotional Discount</span>
                <span>-{formatPrice(orderDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Delivery ({confirmedOrder.shippingMethodName || selectedShippingMethod?.name || "Standard"})</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-display text-lg text-foreground">
              <span>Total Payable</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 pt-4 border-t border-border">
            <Button
              asChild
              className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-wider py-5 px-6"
            >
              <Link href="/account/orders">
                <PackageCheck size={14} className="mr-2" />
                VIEW IN MY ORDERS
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-none text-[10px] tracking-wider py-5 px-6"
            >
              <Link href="/shop">CONTINUE SHOPPING</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Secure Checkout" title="Complete Your Order">
      <form className="mt-8 grid gap-10 lg:grid-cols-[1fr_390px]" onSubmit={handleSubmit}>
        <div className="space-y-8">
          {errorMessage && (
            <div className="border border-[#b86d5a] bg-[#fbf2ef] p-4 text-xs text-[#8f2d18] flex items-start gap-2.5">
              <Info size={16} className="shrink-0 mt-0.5 text-[#b86d5a]" />
              <div>
                <p className="font-semibold">Checkout Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Customer Information */}
          <section>
            <h2 className="font-display text-2xl">Customer Information</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                required
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (!cardData.name) {
                    setCardData((prev) => ({ ...prev, name: e.target.value }));
                  }
                }}
                className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
              <input
                required
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
            </div>
            <div className="mt-3">
              <input
                type="tel"
                placeholder="Phone number (for delivery notifications)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 w-full border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
            </div>
          </section>

          {/* Shipping Address */}
          <section>
            <h2 className="font-display text-2xl">Shipping Address</h2>
            <div className="mt-4 grid gap-3">
              <input
                required
                placeholder="Street address / Apartment / Suite"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
                <input
                  placeholder="County (e.g. Greater London)"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
                <input
                  required
                  placeholder="Postcode (e.g. W1K 7AA)"
                  value={formData.pinCode}
                  onChange={(e) =>
                    setFormData({ ...formData, pinCode: e.target.value.toUpperCase() })
                  }
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
              </div>
            </div>
          </section>

          {/* Delivery Method Selection */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Delivery Method</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Truck size={14} className="text-rosewood" />
                <span>Tracked UK Royal Mail Dispatch</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {shippingMethods.map((method) => {
                const isSelected = selectedShippingMethod?.id === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedShippingMethod(method)}
                    className={`relative cursor-pointer border p-4 transition-all ${
                      isSelected
                        ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                        : "border-border bg-white/50 hover:bg-stone-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          id={`shipping-${method.id}`}
                          name="shipping_choice"
                          checked={isSelected}
                          onChange={() => setSelectedShippingMethod(method)}
                          className="mt-0.5 h-4 w-4 text-rosewood"
                        />
                        <div>
                          <label
                            htmlFor={`shipping-${method.id}`}
                            className="font-medium text-foreground cursor-pointer text-sm block"
                          >
                            {method.name}
                          </label>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Clock size={12} />
                            <span>{method.timeframe}</span>
                          </div>
                          {method.description && (
                            <p className="mt-1.5 text-[11px] text-[#776a61] leading-relaxed">
                              {method.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-base text-foreground block">
                          {formatPrice(method.price)}
                        </span>
                        {method.isDefault && (
                          <span className="mt-0.5 inline-block text-[9px] font-semibold uppercase tracking-wider text-rosewood">
                            Standard
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Payment Selection */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Payment Method</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>256-Bit Encrypted & Verified</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {/* Option 1: Credit / Debit Card */}
              <div
                onClick={() => setPaymentMethod("CARD")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "CARD"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-card"
                      name="payment_choice"
                      checked={paymentMethod === "CARD"}
                      onChange={() => setPaymentMethod("CARD")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-card"
                      className="font-medium text-foreground cursor-pointer text-sm"
                    >
                      Credit / Debit Card
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <CreditCard size={18} className="text-foreground" />
                    <span>Visa / Mastercard / Amex</span>
                  </div>
                </div>

                {paymentMethod === "CARD" && (
                  <div
                    className="mt-4 space-y-3 border-t border-border/80 pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Cardholder Name
                      </label>
                      <input
                        required={paymentMethod === "CARD"}
                        type="text"
                        placeholder="Name on card"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                        className="mt-1 h-10 w-full border border-border bg-white px-3 text-xs outline-none focus:border-rosewood"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Card Number
                        </label>
                        {detectedCardBrand && (
                          <span className="text-[10px] font-semibold text-rosewood uppercase">
                            {detectedCardBrand}
                          </span>
                        )}
                      </div>
                      <input
                        required={paymentMethod === "CARD"}
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={cardData.number}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="mt-1 h-10 w-full border border-border bg-white px-3 font-mono text-xs outline-none focus:border-rosewood"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Exp Month
                        </label>
                        <input
                          required={paymentMethod === "CARD"}
                          type="text"
                          placeholder="MM (e.g. 12)"
                          maxLength={2}
                          value={cardData.expMonth}
                          onChange={(e) =>
                            setCardData({
                              ...cardData,
                              expMonth: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="mt-1 h-10 w-full border border-border bg-white px-3 font-mono text-xs outline-none focus:border-rosewood"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Exp Year
                        </label>
                        <input
                          required={paymentMethod === "CARD"}
                          type="text"
                          placeholder="YY (e.g. 28)"
                          maxLength={4}
                          value={cardData.expYear}
                          onChange={(e) =>
                            setCardData({
                              ...cardData,
                              expYear: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="mt-1 h-10 w-full border border-border bg-white px-3 font-mono text-xs outline-none focus:border-rosewood"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          CVC / CVV
                        </label>
                        <input
                          required={paymentMethod === "CARD"}
                          type="password"
                          placeholder="3 digits"
                          maxLength={4}
                          value={cardData.cvc}
                          onChange={(e) =>
                            setCardData({
                              ...cardData,
                              cvc: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="mt-1 h-10 w-full border border-border bg-white px-3 font-mono text-xs outline-none focus:border-rosewood"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-1">
                      <ShieldCheck size={12} className="text-emerald-700 shrink-0" />
                      Encrypted directly with merchant gateway. Card credentials are never stored.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 2: PayPal */}
              <div
                onClick={() => setPaymentMethod("PAYPAL")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "PAYPAL"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-paypal"
                      name="payment_choice"
                      checked={paymentMethod === "PAYPAL"}
                      onChange={() => setPaymentMethod("PAYPAL")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-paypal"
                      className="font-medium text-foreground cursor-pointer text-sm flex items-center gap-2"
                    >
                      <span>PayPal</span>
                      <span className="rounded bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 font-semibold">
                        Express
                      </span>
                    </label>
                  </div>
                  <span className="font-serif italic text-blue-900 font-bold text-sm">PayPal</span>
                </div>
                {paymentMethod === "PAYPAL" && (
                  <div className="mt-4 border-t border-border/60 pt-4 pl-7 pr-2 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Authorize your purchase securely with your PayPal balance, linked bank account,
                      debit or credit card, or PayPal Pay in 3 installments.
                    </p>
                    <PayPalCheckoutButton
                      amount={orderTotal}
                      currency="GBP"
                      items={cart.map((c) => ({
                        productId: c.productId,
                        quantity: c.quantity,
                      }))}
                      couponCode={appliedCoupon?.code}
                      shippingMethodId={selectedShippingMethod?.id}
                      validateBeforePayment={validateAddressForm}
                      disabled={isSubmitting}
                      onSuccess={async (res) => {
                        await submitOrderWithDetails("PAYPAL", {
                          paypalOrderId: res.paypalOrderId,
                          captureId: res.captureId,
                          payerEmail: res.payerEmail || formData.email.trim(),
                        });
                      }}
                      onError={(err) => {
                        setErrorMessage(err);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Option 3: Google Pay */}
              <div
                onClick={() => setPaymentMethod("GOOGLE_PAY")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "GOOGLE_PAY"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-gpay"
                      name="payment_choice"
                      checked={paymentMethod === "GOOGLE_PAY"}
                      onChange={() => setPaymentMethod("GOOGLE_PAY")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-gpay"
                      className="font-medium text-foreground cursor-pointer text-sm flex items-center gap-2"
                    >
                      <Smartphone size={16} />
                      Google Pay
                    </label>
                  </div>
                  <span className="font-semibold text-xs tracking-wider text-stone-700">G Pay</span>
                </div>
                {paymentMethod === "GOOGLE_PAY" && (
                  <div className="mt-3 text-xs text-muted-foreground pl-7 leading-relaxed">
                    Check out quickly using payment cards saved in your Google Account. Fast and
                    biometrically protected.
                  </div>
                )}
              </div>

              {/* Option 4: Apple Pay */}
              <div
                onClick={() => setPaymentMethod("APPLE_PAY")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "APPLE_PAY"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-applepay"
                      name="payment_choice"
                      checked={paymentMethod === "APPLE_PAY"}
                      onChange={() => setPaymentMethod("APPLE_PAY")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-applepay"
                      className="font-medium text-foreground cursor-pointer text-sm flex items-center gap-2"
                    >
                       Apple Pay
                      {hasApplePay && (
                        <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 font-semibold">
                          Device Ready
                        </span>
                      )}
                    </label>
                  </div>
                  <span className="font-medium text-xs text-stone-800">Touch / Face ID</span>
                </div>
                {paymentMethod === "APPLE_PAY" && (
                  <div className="mt-3 text-xs text-muted-foreground pl-7 leading-relaxed">
                    {hasApplePay
                      ? "Seamless one-touch checkout via Safari on iOS or macOS with Face ID / Touch ID."
                      : "Apple Pay is supported on Safari browsers running on compatible iOS and macOS devices."}
                  </div>
                )}
              </div>

              {/* Option 5: Klarna */}
              <div
                onClick={() => setPaymentMethod("KLARNA")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "KLARNA"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-klarna"
                      name="payment_choice"
                      checked={paymentMethod === "KLARNA"}
                      onChange={() => setPaymentMethod("KLARNA")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-klarna"
                      className="font-medium text-foreground cursor-pointer text-sm flex items-center gap-2"
                    >
                      Klarna
                      <span className="rounded bg-pink-100 text-pink-800 text-[10px] px-1.5 py-0.5 font-semibold">
                        Pay in 3
                      </span>
                    </label>
                  </div>
                  <span className="font-bold text-xs bg-pink-500 text-white px-2 py-0.5 rounded-sm">
                    Klarna.
                  </span>
                </div>
                {paymentMethod === "KLARNA" && (
                  <div className="mt-3 text-xs text-muted-foreground pl-7 leading-relaxed">
                    Split your purchase into <strong>3 interest-free payments</strong> of{" "}
                    <strong>{formatPrice(orderTotal / 3)}</strong>. No added fees when paid on time.
                  </div>
                )}
              </div>

              {/* Option 6: Direct Bank Transfer */}
              <div
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-bacs"
                      name="payment_choice"
                      checked={paymentMethod === "BANK_TRANSFER"}
                      onChange={() => setPaymentMethod("BANK_TRANSFER")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-bacs"
                      className="font-medium text-foreground cursor-pointer text-sm flex items-center gap-2"
                    >
                      <Building2 size={16} />
                      Direct Bank Transfer (BACS)
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">UK Wire</span>
                </div>
                {paymentMethod === "BANK_TRANSFER" && (
                  <div className="mt-3 border-t border-border/80 pt-3 text-xs text-muted-foreground pl-7 space-y-1">
                    <p>Make your payment directly into our UK business bank account.</p>
                    <p className="text-[11px] text-stone-700">
                      Sort Code: <strong>20-00-00</strong> | Account: <strong>83920194</strong>
                    </p>
                    <p className="text-[10px]">
                      Your order reference will be generated on confirmation for payment matching.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 7: Cash on Delivery */}
              <div
                onClick={() => setPaymentMethod("COD")}
                className={`cursor-pointer border p-4 transition-colors ${
                  paymentMethod === "COD"
                    ? "border-rosewood bg-stone-50/90 ring-1 ring-rosewood"
                    : "border-border bg-white/50 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-cod"
                      name="payment_choice"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="h-4 w-4 text-rosewood"
                    />
                    <label
                      htmlFor="method-cod"
                      className="font-medium text-foreground cursor-pointer text-sm flex items-center gap-2"
                    >
                      <Banknote size={16} />
                      Cash on Delivery
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">Pay on Arrival</span>
                </div>
                {paymentMethod === "COD" && (
                  <div className="mt-3 text-xs text-muted-foreground pl-7 leading-relaxed">
                    Pay securely in cash directly to the courier when your order arrives at your
                    doorstep. Available across all UK delivery postcodes.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Order Summary Aside */}
        <aside className="h-fit border border-border bg-white/40 p-6 backdrop-blur-xs">
          <h2 className="font-display text-2xl">Order Summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            {cartProducts(cart).map(({ item, product }) => (
              <div key={product.id} className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  {product.name} × {item.quantity}
                </span>
                <span className="font-medium text-foreground">
                  {formatPrice((product.salePrice ?? product.price) * item.quantity)}
                </span>
              </div>
            ))}

            {/* Subtotal */}
            <div className="flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {/* Promotional Code Input & Applied State */}
            <div className="border-t border-border pt-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded bg-[#f4ede6] px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-[#8f5d48]">
                    <Tag size={13} />
                    <span className="font-mono font-semibold">{appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="inline-flex items-center gap-1 text-[11px] text-[#a04040] hover:underline"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. GLOW15)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="h-9 flex-1 border border-border bg-white px-2.5 text-xs font-mono uppercase outline-none focus:border-rosewood"
                    />
                    <Button
                      type="button"
                      onClick={applyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="h-9 rounded-none bg-ink text-white hover:bg-black px-3 text-[10px] uppercase tracking-wider"
                    >
                      {isValidatingCoupon ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {couponError && <p className="text-[11px] text-[#8f2d18]">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Discount Display */}
            {discount > 0 && (
              <div className="flex justify-between text-xs text-[#4b6742] font-medium">
                <span>Discount ({appliedCoupon?.code})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}

            {/* Shipping */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Delivery ({selectedShippingMethod?.name || "Normal"})</span>
              <span className="font-medium text-foreground">
                {formatPrice(shippingCharge)}
              </span>
            </div>

            {/* Order Total */}
            <div className="flex justify-between border-t border-border pt-4 font-semibold text-base text-foreground">
              <span>Total</span>
              <span>{formatPrice(orderTotal)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 text-right">
              Includes 20% UK VAT. Complimentary delivery over £70.
            </p>
          </div>

          {paymentMethod === "PAYPAL" ? (
            <Button
              type="button"
              onClick={() => {
                if (validateAddressForm()) {
                  const paypalOption = document.getElementById("method-paypal");
                  paypalOption?.scrollIntoView({ behavior: "smooth", block: "center" });
                  toast.info("Please complete authorization using the PayPal button under Payment Options.");
                }
              }}
              disabled={isSubmitting}
              className="mt-8 w-full rounded-none bg-[#0070ba] text-white hover:bg-[#005ea6] py-6 text-[10px] font-semibold tracking-[0.14em]"
            >
              PAY WITH PAYPAL — {formatPrice(orderTotal)}
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  VERIFYING & PROCESSING ORDER...
                </span>
              ) : (
                `CONFIRM ORDER — ${formatPrice(orderTotal)}`
              )}
            </Button>
          )}
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck size={13} className="text-emerald-700" />
            <span>Encrypted Server-Side Checkout</span>
          </div>
        </aside>
      </form>
    </PageShell>
  );
}
