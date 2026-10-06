import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
