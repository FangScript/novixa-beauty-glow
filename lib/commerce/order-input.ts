import { z } from "zod";

const text = z.string().trim().max(180);
const shipping = z.object({
  fullName: text.optional(),
  phone: text.optional(),
  line1: text.optional(),
  line2: text.optional(),
  addressLines: z.array(text).max(3).optional(),
  city: text.optional(),
  locality: text.optional(),
  state: text.optional(),
  administrativeArea: text.optional(),
  postalCode: text.optional(),
  country: text.optional(),
  countryCode: text.optional(),
});
export const orderInput = z.object({
  items: z.unknown(),
  couponCode: z.string().max(64).nullish(),
  shippingMethodId: text.optional(),
  customer: z
    .object({
      name: text.optional(),
      email: z.string().trim().email().max(254).optional(),
      phone: text.optional(),
    })
    .optional(),
  address: z
    .object({
      line1: text.optional(),
      line2: text.optional(),
      city: text.optional(),
      state: text.optional(),
      postalCode: text.optional(),
      country: text.optional(),
    })
    .optional(),
  paymentMethod: z.enum(["PAYPAL", "CARD", "GOOGLE_PAY", "APPLE_PAY"]),
  // Store only provider references and shipping/contact details, never card numbers or wallet tokens.
  paymentDetails: z
    .object({
      paypalOrderId: text.optional(),
      orderId: text.optional(),
      captureId: text.optional(),
      payerId: text.optional(),
      payerEmail: z.string().trim().email().max(254).optional(),
      payerName: text.optional(),
      phone: text.optional(),
      shippingAddress: shipping.optional(),
      last4: z.string().max(4).optional(),
      cardLast4: z.string().max(4).optional(),
      brand: text.optional(),
      cardBrand: text.optional(),
      status: text.optional(),
    })
    .default({}),
});
