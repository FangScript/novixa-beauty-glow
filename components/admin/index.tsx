"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  Percent,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Star,
  Tags,
  Users,
  Warehouse,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { products, formatPrice, type Product } from "@/lib/products/catalogue";

export const nav = [
  ["Overview", "/admin", LayoutDashboard],
  ["Products", "/admin/products", Package],
  ["Orders", "/admin/orders", ClipboardList],
  ["Customers", "/admin/customers", Users],
  ["Inventory", "/admin/inventory", Warehouse],
  ["Categories", "/admin/categories", Tags],
  ["Bundles", "/admin/bundles", Boxes],
  ["Coupons", "/admin/coupons", Percent],
  ["Reviews", "/admin/reviews", Star],
  ["Analytics", "/admin/analytics", BarChart3],
  ["Settings", "/admin/settings", Settings],
] as const;

export function AdminShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.admin) {
          setAdmin(data.admin);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignored
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f6f1eb] text-[#211b18]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-[#d9cec5] bg-[#211b18] p-5 text-[#f8f2ec] transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link href="/admin" className="font-display text-3xl tracking-wide">
            NOVIXA
          </Link>
          <button
            className="lg:hidden text-2xl text-white/70 hover:text-white"
            onClick={() => setMenuOpen(false)}
            aria-label="Close admin navigation"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-[#c9a982]">
          Commerce console
        </p>
        <nav className="mt-8 space-y-1">
          {nav.map(([label, href, Icon]) => {
            const isActive =
              href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs transition-colors ${
                  isActive
                    ? "bg-[#51413a] text-[#fff8f1] font-medium"
                    : "text-[#cfc3bb] hover:bg-[#3d302b] hover:text-white"
                }`}
              >
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-5 bottom-5 border-t border-white/10 pt-4 text-[10px] text-white/50">
          <p className="uppercase tracking-widest text-[8px] text-[#c9a982]">Protected Workspace</p>
          <p className="mt-1">Admin role verified</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#d9cec5] bg-[#f6f1eb]/95 px-5 backdrop-blur-sm md:px-8">
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden text-foreground"
            aria-label="Open admin navigation"
          >
            <Menu size={20} />
          </button>
          <div className="hidden text-xs text-[#776a61] sm:block">Admin / {title}</div>
          <div className="flex items-center gap-4">
            <span className="hidden text-right text-xs text-[#776a61] sm:inline">
              <strong className="block font-normal text-[#211b18]">
                {admin?.name ?? "NOVIXA Administrator"}
              </strong>
              <span className="text-[10px] text-[#8f8279]">
                {admin?.email ?? "novixaretail@gmail.com"}
              </span>
            </span>
            <div className="flex h-8 w-8 items-center justify-center bg-[#211b18] text-xs text-white">
              NA
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] uppercase tracking-[0.12em] text-[#8f5d48] hover:text-[#5a3028] underline transition-colors"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-5 md:p-8">
          <div
            className="mb-6 flex items-start gap-3 border border-[#d9b36f] bg-[#f3e4c6] p-3 text-xs text-[#765521]"
            role="status"
          >
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              <strong>Protected workspace:</strong> administrator role verified server-side.
              Product, order, and inventory mutations are attributed to the signed-in admin.
            </p>
          </div>
          <div className="mb-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f5d48]">
              Admin workspace
            </p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">{title}</h1>
            {description && <p className="mt-3 max-w-2xl text-sm text-[#776a61]">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "light",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={`border p-5 ${
        tone === "dark" ? "border-[#211b18] bg-[#211b18] text-white" : "border-[#d9cec5] bg-white/50"
      }`}
    >
      <p
        className={`text-[9px] uppercase tracking-[0.18em] ${
          tone === "dark" ? "text-[#c9a982]" : "text-[#8f5d48]"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 font-display text-3xl">{value}</p>
      <p className={`mt-2 text-xs ${tone === "dark" ? "text-white/60" : "text-[#776a61]"}`}>
        {detail}
      </p>
    </div>
  );
}

export function AdminToolbar({ placeholder = "Search records" }: { placeholder?: string }) {
  return (
    <div className="flex flex-col gap-3 border-y border-[#d9cec5] py-4 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex h-10 flex-1 items-center gap-2 border border-[#d9cec5] bg-white/60 px-3 sm:max-w-md">
        <Search size={15} className="text-[#8f5d48]" />
        <input
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="h-10 rounded-none text-[10px] uppercase tracking-[0.12em]"
        >
          Filter
        </Button>
        <Button className="h-10 rounded-none text-[10px] uppercase tracking-[0.12em] bg-[#211b18] text-white">
          <Plus size={14} /> Create
        </Button>
      </div>
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[#d9cec5] bg-white/60">
      <table className="w-full min-w-[700px] border-collapse text-left text-xs">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-[#d9cec5] bg-[#ede4dc] text-[9px] uppercase tracking-[0.15em] text-[#776a61]">
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

export function ProductRow({ product }: { product: Product }) {
  return (
    <tr className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
      <TableCell>
        <div className="flex items-center gap-3">
          <img src={product.images[0]} alt="" className="h-10 w-10 object-cover" />
          <div>
            <p className="font-medium text-[#211b18]">{product.name}</p>
            <p className="mt-1 text-[10px] text-[#8f8279]">{product.sku}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{product.category}</TableCell>
      <TableCell>{product.gender}</TableCell>
      <TableCell>{formatPrice(product.salePrice ?? product.price)}</TableCell>
      <TableCell>
        <span
          className={`inline-flex px-2 py-1 text-[9px] uppercase ${
            product.stock <= 5 ? "bg-[#f1d2c9] text-[#8f3f2d]" : "bg-[#dfe8d9] text-[#4b6742]"
          }`}
        >
          {product.stock <= 5 ? "Low stock" : "Active"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/products/${product.slug}`} className="text-[#8f5d48] underline">
          View
        </Link>
      </TableCell>
    </tr>
  );
}

export const adminProducts = products;

export function AdminDialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#211b18]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#d9cec5] bg-[#f6f1eb] p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-5 border-b border-[#d9cec5] pb-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8f5d48]">Admin action</p>
            <h2 className="mt-2 font-display text-3xl">{title}</h2>
            {description && <p className="mt-2 text-xs text-[#776a61]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-[#776a61] hover:text-black"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#776a61]">
      {label}
      {hint && (
        <span className="ml-2 font-normal normal-case tracking-normal text-[#a08f84]">{hint}</span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function AdminStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "positive" | "warning" | "danger" | "neutral";
}) {
  const styles = {
    positive: "bg-[#dfe8d9] text-[#4b6742]",
    warning: "bg-[#f3e4c6] text-[#846126]",
    danger: "bg-[#f1d2c9] text-[#8f3f2d]",
    neutral: "bg-[#e5dfd7] text-[#776a61]",
  };
  return (
    <span
      className={`inline-flex px-2 py-1 text-[9px] uppercase tracking-[0.08em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
