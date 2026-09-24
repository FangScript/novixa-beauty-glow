"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, UserRound } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";

export default function AccountPage() {
  const { user, isLoading, logout } = useCustomerAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <PageShell eyebrow="Your NOVIXA" title="Account">
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 size={22} className="animate-spin text-rosewood" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell
        eyebrow="Your NOVIXA"
        title="Account"
        copy="Sign in or create an account to manage your orders, addresses, and fragrance preferences."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            className="rounded-none bg-ink py-6 px-8 text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-black"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-none py-6 px-8 text-[10px] font-semibold uppercase tracking-[0.14em]"
          >
            <Link href="/login?tab=register">Create Account</Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Order History", "Track your NOVIXA purchases and view receipts"],
            ["Saved Addresses", "Store delivery destinations for faster checkout"],
            ["Wishlist", "Your curated fragrance edit, saved and ready"],
          ].map(([title, copy]) => (
            <div key={title} className="border border-border bg-white/30 p-6">
              <h2 className="font-display text-2xl tracking-tight text-foreground/60">{title}</h2>
              <p className="mt-2 text-xs text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <PageShell eyebrow="Your NOVIXA" title="Account">
      {/* Welcome header */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rosewood/10 text-rosewood font-semibold text-sm">
          {initials}
        </div>
        <div>
          <p className="font-display text-xl text-foreground">
            Welcome back, {user.name.split(" ")[0]}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Account links */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Orders", href: "/account/orders", desc: "Track and review your purchases" },
          {
            label: "Addresses",
            href: "/account/addresses",
            desc: "Manage saved delivery destinations",
          },
          { label: "Profile", href: "/account/profile", desc: "Update your personal details" },
          { label: "Wishlist", href: "/wishlist", desc: "Your saved signature edit" },
        ].map(({ label, href, desc }) => (
          <Link
            key={label}
            href={href}
            className="border border-border bg-white/40 p-6 transition-all hover:border-rosewood hover:bg-white/60"
          >
            <h2 className="font-display text-2xl tracking-tight text-foreground">{label}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Member info + sign out */}
      <div className="mt-12 flex flex-col gap-4 border border-border bg-white/40 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl">Member Account</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Your session is active and secure. Orders placed while signed in are linked to your
            account automatically.
          </p>
        </div>
        <Button
          id="account-signout"
          variant="outline"
          onClick={handleLogout}
          className="shrink-0 rounded-none text-xs uppercase tracking-wider gap-2"
        >
          <LogOut size={13} />
          Sign Out
        </Button>
      </div>
    </PageShell>
  );
}
