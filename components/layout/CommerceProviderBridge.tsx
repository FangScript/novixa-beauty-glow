"use client";

import { useCustomerAuth } from "@/lib/auth/customer-context";
import { CommerceProvider } from "@/lib/commerce/context";
import type { ReactNode } from "react";

/**
 * Reads the current user from CustomerAuthContext and passes the userId
 * down into CommerceProvider so the cart & wishlist are server-backed.
 */
export function CommerceProviderBridge({ children }: { children: ReactNode }) {
  const { user } = useCustomerAuth();
  return <CommerceProvider userId={user?.id}>{children}</CommerceProvider>;
}
