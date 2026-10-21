import { randomBytes, createHash } from "node:crypto";

export function recoveryTokenId(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Invalid recovery token.");
  // Domain separation prevents a recovery token being used as a login cookie.
  return "password-reset:" + createHash("sha256").update(token).digest("hex");
}
export function newRecoveryToken() {
  const token = randomBytes(32).toString("hex");
  return { token, id: recoveryTokenId(token), expiresAt: new Date(Date.now() + 15 * 60000) };
}
