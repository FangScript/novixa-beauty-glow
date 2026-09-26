"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  PackageCheck,
  Tag,
  X,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Info,
  Check,
  Truck,
  Clock,
  Lock,
  HelpCircle,
  Building2,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { AddressSelector } from "@/components/address/AddressSelector";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import { PayPalCheckoutButton } from "@/components/checkout/PayPalCheckoutButton";
import {
  CardBrandBadges,
  PayPalBadge,
  GooglePayBadge,
  ApplePayBadge,
  KlarnaBadge,
  BankTransferBadges,
  VisaLogo,
  MastercardLightLogo,
  AmexLogo,
  DiscoverLogo,
  DinersClubLogo,
  UnionPayLogo,
  JcbLogo,
  EloLogo,
  MaestroLogo,
} from "@/components/checkout/CardBrandBadges";

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
  const router = useRouter();
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
    country: "United Kingdom",
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
  const [expiryInput, setExpiryInput] = useState("");
  const [useShippingAsBilling, setUseShippingAsBilling] = useState(true);

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
    const savedMethodId = typeof window !== "undefined" ? localStorage.getItem("novixa_shipping_method_id") : null;
    fetch("/api/shipping-methods")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.methods) && data.methods.length > 0) {
          setShippingMethods(data.methods);
          const matched = savedMethodId ? data.methods.find((m: any) => m.id === savedMethodId) : null;
          const defaultOpt = matched || data.methods.find((m: any) => m.isDefault) || data.methods[0];
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
    setCardData((prev) => ({ ...prev, number: formatted }));
  };

  // Expiration date (MM / YY) handler
  const handleExpiryChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "").slice(0, 4);
    let formatted = digitsOnly;
    if (digitsOnly.length > 2) {
      formatted = `${digitsOnly.slice(0, 2)} / ${digitsOnly.slice(2, 4)}`;
    }
    setExpiryInput(formatted);

    const month = digitsOnly.slice(0, 2);
    const year = digitsOnly.slice(2, 4);
    setCardData((prev) => ({
      ...prev,
      expMonth: month,
      expYear: year,
    }));
  };

  // Security code (CVC) handler
  const handleCvcChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "").slice(0, 4);
    setCardData((prev) => ({ ...prev, cvc: digitsOnly }));
  };

  // Card brand detection for all supported payment networks
  const detectedCardBrand = useMemo(() => {
    const clean = cardData.number.replace(/\s+/g, "");
    if (!clean) return null;
    if (/^4/.test(clean)) return "Visa";
    if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
    if (/^3[47]/.test(clean)) return "American Express";
    if (/^6(011|5|4[4-9])/.test(clean)) return "Discover";
    if (/^3(0[0-5]|[689])/.test(clean)) return "Diners Club";
    if (/^(?:2131|1800|35\d{3})/.test(clean)) return "JCB";
    if (/^(62|81)/.test(clean)) return "UnionPay";
    if (/^(5018|5020|5038|5893|6304|6759|6761|6762|6763)/.test(clean)) return "Maestro";
    if (/^(4011|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363)/.test(clean)) return "Elo";
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
    if (!user) {
      toast.error("You must be signed in to your account to place an order.");
      router.push("/login?next=/checkout");
      return;
    }

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
    if (!user) {
      toast.error("You must be signed in to your account to place an order.");
      router.push("/login?next=/checkout");
      return;
    }
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
      if (!cardData.expMonth || !cardData.expYear || cardData.expMonth.length < 2 || cardData.expYear.length < 2) {
        setErrorMessage("Please enter valid card expiration date (MM / YY).");
        toast.error("Valid card expiration date (MM / YY) required.");
        return;
      }
      const m = parseInt(cardData.expMonth, 10);
      if (isNaN(m) || m < 1 || m > 12) {
        setErrorMessage("Please enter a valid expiration month (01-12).");
        toast.error("Invalid expiration month.");
        return;
      }
      if (!cardData.cvc || cardData.cvc.length < 3) {
        setErrorMessage("Please enter a valid security code (3-4 digits).");
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
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Payment Method</span>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium">
                  {methodDisplayNames[orderPayMethod as PaymentMethodType] || orderPayMethod}
                </span>
                {orderPayMethod === "CARD" && (
                  <div className="flex items-center gap-1">
                    <VisaLogo className="h-4 w-6.5" />
                    <MastercardLightLogo className="h-4 w-6.5" />
                  </div>
                )}
                {orderPayMethod === "PAYPAL" && <PayPalBadge className="h-4 w-12" />}
                {orderPayMethod === "GOOGLE_PAY" && <GooglePayBadge className="h-4 w-9" />}
                {orderPayMethod === "APPLE_PAY" && <ApplePayBadge className="h-4 w-9" />}
                {orderPayMethod === "KLARNA" && <KlarnaBadge className="h-4 w-9" />}
                {orderPayMethod === "BANK_TRANSFER" && <BankTransferBadges className="h-4" />}
              </div>
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
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">BACS Bank Transfer Instructions:</p>
                <BankTransferBadges className="h-4" />
              </div>
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
      {!user && (
        <div className="mb-8 border border-amber-300 bg-amber-50/90 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="text-amber-800 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-950">
                Sign In Required to Place Order
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Orders can only be placed by verified account holders. Please sign in or create an account to proceed with checkout.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => router.push("/login?next=/checkout")}
            className="rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-wider shrink-0 py-4 px-6 font-semibold"
          >
            Sign In / Register
          </Button>
        </div>
      )}

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
            <div className="mt-4">
              <AddressSelector
                value={{
                  address: formData.address,
                  city: formData.city,
                  state: formData.state,
                  pinCode: formData.pinCode,
                  country: formData.country,
                }}
                onChange={(updated) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: updated.address,
                    city: updated.city,
                    state: updated.state,
                    pinCode: updated.pinCode,
                    country: updated.country || prev.country,
                  }))
                }
              />
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
                    onClick={() => {
                      setSelectedShippingMethod(method);
                      try { localStorage.setItem("novixa_shipping_method_id", method.id); } catch {}
                    }}
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
                          onChange={() => {
                            setSelectedShippingMethod(method);
                            try { localStorage.setItem("novixa_shipping_method_id", method.id); } catch {}
                          }}
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
                className={`cursor-pointer rounded-xl border transition-all ${
                  paymentMethod === "CARD"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
                }`}
              >
                {/* Header matching reference screenshot */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-card"
                      name="payment_choice"
                      checked={paymentMethod === "CARD"}
                      onChange={() => setPaymentMethod("CARD")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="method-card"
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base select-none"
                    >
                      Credit card
                    </label>
                  </div>

                  {/* All Accepted Card Brands directly visible */}
                  <CardBrandBadges detectedBrand={detectedCardBrand} />
                </div>

                {paymentMethod === "CARD" && (
                  <div
                    className="border-t border-stone-200 bg-[#f8fafc] p-4 sm:p-5 space-y-3.5 rounded-b-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Row 1: Card Number */}
                    <div>
                      <div className="relative">
                        <input
                          required={paymentMethod === "CARD"}
                          type="text"
                          placeholder="Card number"
                          maxLength={19}
                          value={cardData.number}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-mono"
                        />
                        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                          {detectedCardBrand === "Visa" ? (
                            <VisaLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "Mastercard" ? (
                            <MastercardLightLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "American Express" ? (
                            <AmexLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "Discover" ? (
                            <DiscoverLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "Diners Club" ? (
                            <DinersClubLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "JCB" ? (
                            <JcbLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "UnionPay" ? (
                            <UnionPayLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "Elo" ? (
                            <EloLogo className="h-4 w-7" />
                          ) : detectedCardBrand === "Maestro" ? (
                            <MaestroLogo className="h-4 w-7" />
                          ) : (
                            <Lock className="h-4 w-4 text-stone-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Expiration Date & Security Code in 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          required={paymentMethod === "CARD"}
                          type="text"
                          placeholder="Expiration date (MM / YY)"
                          maxLength={7}
                          value={expiryInput}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="relative">
                        <input
                          required={paymentMethod === "CARD"}
                          type="password"
                          placeholder="Security code"
                          maxLength={4}
                          value={cardData.cvc}
                          onChange={(e) => handleCvcChange(e.target.value)}
                          className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-mono"
                        />
                        <div
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                          title="3-digit CVV on back (or 4 digits on front for Amex)"
                        >
                          <HelpCircle className="h-4 w-4 cursor-help hover:text-stone-600 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Name on card */}
                    <div>
                      <input
                        required={paymentMethod === "CARD"}
                        type="text"
                        placeholder="Name on card"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                        className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                      />
                    </div>

                    {/* Row 4: Use shipping address as billing address checkbox */}
                    <div className="pt-1">
                      <label className="flex items-center gap-2.5 text-xs text-stone-700 cursor-pointer select-none">
                        <div
                          className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors ${
                            useShippingAsBilling
                              ? "bg-blue-600 text-white"
                              : "border border-stone-300 bg-white"
                          }`}
                        >
                          {useShippingAsBilling && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={useShippingAsBilling}
                          onChange={(e) => setUseShippingAsBilling(e.target.checked)}
                          className="sr-only"
                        />
                        <span className="font-normal text-stone-700 text-xs sm:text-[13px]">
                          Use shipping address as billing address
                        </span>
                      </label>
                    </div>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-stone-200/60">
                      <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
                      Encrypted directly with merchant gateway. Card credentials are never stored.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 2: PayPal */}
              <div
                onClick={() => setPaymentMethod("PAYPAL")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  paymentMethod === "PAYPAL"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="method-paypal"
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base flex items-center gap-2 select-none"
                    >
                      <span>PayPal</span>
                      <span className="rounded bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 font-semibold">
                        Express
                      </span>
                    </label>
                  </div>
                  <PayPalBadge className="h-5 w-16" />
                </div>
                {paymentMethod === "PAYPAL" && (
                  <div className="mt-4 border-t border-stone-200 bg-[#f8fafc] -mx-4 -mb-4 p-4 sm:p-5 rounded-b-xl space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Authorize your purchase securely with your PayPal balance, linked bank account,
                      debit or credit card, or PayPal Pay in 3 installments.
                    </p>
                    {!user ? (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-xs text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span>Please sign in to your account before authorizing PayPal payment.</span>
                        <Button
                          type="button"
                          onClick={() => router.push("/login?next=/checkout")}
                          className="text-[10px] bg-[#211b18] text-white hover:bg-black rounded-none py-1.5 px-4 h-8 uppercase font-semibold shrink-0"
                        >
                          Sign In / Register
                        </Button>
                      </div>
                    ) : (
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
                    )}
                  </div>
                )}
              </div>

              {/* Option 3: Google Pay */}
              <div
                onClick={() => setPaymentMethod("GOOGLE_PAY")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  paymentMethod === "GOOGLE_PAY"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="method-gpay"
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base flex items-center gap-2 select-none"
                    >
                      <Smartphone size={16} />
                      Google Pay
                    </label>
                  </div>
                  <GooglePayBadge className="h-5 w-12" />
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
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  paymentMethod === "APPLE_PAY"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
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
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base flex items-center gap-2 select-none"
                    >
                      Apple Pay
                      {hasApplePay && (
                        <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 font-semibold">
                          Device Ready
                        </span>
                      )}
                    </label>
                  </div>
                  <ApplePayBadge className="h-5 w-12" />
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
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  paymentMethod === "KLARNA"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="method-klarna"
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base flex items-center gap-2 select-none"
                    >
                      Klarna
                      <span className="rounded bg-pink-100 text-pink-800 text-[10px] px-1.5 py-0.5 font-semibold">
                        Pay in 3
                      </span>
                    </label>
                  </div>
                  <KlarnaBadge className="h-5 w-12" />
                </div>
                {paymentMethod === "KLARNA" && (
                  <div className="mt-3 text-xs text-muted-foreground pl-7 leading-relaxed">
                    Split your purchase into <strong>3 interest-free payments</strong> of{" "}
                    <strong>{formatPrice(orderTotal / 3)}</strong>. No added fees when paid on time.
                  </div>
                )}
              </div>

              {/* Option 6: Direct BACS Bank Transfer */}
              <div
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="method-bank"
                      name="payment_choice"
                      checked={paymentMethod === "BANK_TRANSFER"}
                      onChange={() => setPaymentMethod("BANK_TRANSFER")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="method-bank"
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base flex items-center gap-2 select-none"
                    >
                      <Building2 size={16} />
                      Direct Bank Transfer
                    </label>
                  </div>
                  <BankTransferBadges />
                </div>
                {paymentMethod === "BANK_TRANSFER" && (
                  <div className="mt-4 border-t border-stone-200 bg-[#f8fafc] -mx-4 -mb-4 p-4 sm:p-5 rounded-b-xl space-y-2.5 text-xs text-stone-700 leading-relaxed">
                    <p className="font-semibold text-foreground">Pay via direct online or mobile banking:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-white p-3 rounded-lg border border-stone-200">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-sans">Bank:</span>
                        Barclays Bank UK
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-sans">Account Name:</span>
                        Novixa Beauty Glow Ltd
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-sans">Sort Code:</span>
                        20-00-00
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-sans">Account No:</span>
                        83920194
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use your order reference as the payment description. Your order will be confirmed upon funds receipt.
                    </p>
                  </div>
                )}
              </div>

              {/* Option 7: Cash on Delivery */}
              <div
                onClick={() => setPaymentMethod("COD")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  paymentMethod === "COD"
                    ? "border-blue-600 ring-1 ring-blue-600 bg-white shadow-xs"
                    : "border-border bg-white/60 hover:bg-stone-50/50"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="method-cod"
                      className="font-medium text-foreground cursor-pointer text-sm sm:text-base flex items-center gap-2 select-none"
                    >
                      <Banknote size={16} />
                      Cash on Delivery
                    </label>
                  </div>
                  <span className="flex h-5 items-center justify-center rounded-[3px] bg-stone-800 px-2 text-[10px] font-bold text-white shadow-xs">
                    COD
                  </span>
                </div>
                {paymentMethod === "COD" && (
                  <div className="mt-3 text-xs text-muted-foreground pl-7 leading-relaxed">
                    Pay securely in cash directly to the courier upon delivery at your doorstep.
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

          {!user ? (
            <Button
              type="button"
              onClick={() => router.push("/login?next=/checkout")}
              className="mt-8 w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
            >
              SIGN IN TO PLACE ORDER — {formatPrice(orderTotal)}
            </Button>
          ) : paymentMethod === "PAYPAL" ? (
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
