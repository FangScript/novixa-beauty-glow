import { createHmac, timingSafeEqual } from "node:crypto";

export function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return secret;
}

export function signValue(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("hex");
}

export function verifyValue(payload: string, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signValue(payload), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
