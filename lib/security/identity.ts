/** Authorization comes from our database, never user-editable identity metadata. */
export function verifiedExternalEmail(
  user: { email?: string; email_confirmed_at?: string } | null,
) {
  return user?.email_confirmed_at && user.email ? user.email.trim().toLowerCase() : null;
}

export function isDatabaseAdmin(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN";
}

export function customerOrderScope(userId: string) {
  // Guest email claims and substring matches are not proof of order ownership.
  return { userId };
}
