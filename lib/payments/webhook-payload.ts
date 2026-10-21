/** Preserve the original event JSON inside the postback, including whitespace and field order. */
export function webhookVerificationBody(fields: Record<string, string>, rawEvent: string) {
  const parsed = JSON.parse(rawEvent);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid webhook event.");
  return JSON.stringify(fields).slice(0, -1) + ',"webhook_event":' + rawEvent + "}";
}
