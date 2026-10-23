export const FREE_STANDARD_THRESHOLD = 70;
export function effectiveShippingPrice(method: { name: string; price: unknown }, subtotal: number) {
  return subtotal >= FREE_STANDARD_THRESHOLD && /normal|standard/i.test(method.name)
    ? 0
    : Number(method.price);
}
export function requireUKDestination(country: unknown = "GB") {
  if (typeof country !== "string" || !/^(GB|UK|United Kingdom)$/i.test(country.trim()))
    throw new Error("Delivery is currently available to United Kingdom addresses only.");
  return "GB";
}
