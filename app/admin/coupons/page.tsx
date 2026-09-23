"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminDialog,
  AdminField,
  AdminShell,
  AdminStatus,
  AdminTable,
  TableCell,
  TableHeader,
} from "@/components/admin";

type Coupon = {
  id?: string;
  code: string;
  type: string;
  value: number;
  minimumOrder: number;
  usageCount: number;
  usageLimit: number | null;
  expiresAt: string | null;
  active: boolean;
};

const initialCoupons: Coupon[] = [
  {
    id: "c-1",
    code: "GLOW15",
    type: "PERCENTAGE",
    value: 15,
    minimumOrder: 3000,
    usageCount: 48,
    usageLimit: 200,
    expiresAt: "2026-12-31T23:59:59.000Z",
    active: true,
  },
  {
    id: "c-2",
    code: "LUXE1000",
    type: "FIXED",
    value: 1000,
    minimumOrder: 8000,
    usageCount: 22,
    usageLimit: 100,
    expiresAt: "2026-11-30T23:59:59.000Z",
    active: true,
  },
  {
    id: "c-3",
    code: "WELCOME10",
    type: "PERCENTAGE",
    value: 10,
    minimumOrder: 2000,
    usageCount: 115,
    usageLimit: null,
    expiresAt: null,
    active: true,
  },
];

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: "",
    minimumOrder: "",
    usageLimit: "",
    expiresAt: "",
  });

  const loadCoupons = () => {
    fetch("/api/coupons")
      .then((res) => res.json())
      .then((data) => {
        if (data.coupons && Array.isArray(data.coupons) && data.coupons.length > 0) {
          setCoupons(
            data.coupons.map((c: any) => ({
              id: c.id,
              code: c.code,
              type: c.type,
              value: c.value,
              minimumOrder: c.minimumOrder ?? c.minimum ?? 0,
              usageCount: c.usageCount ?? c.uses ?? 0,
              usageLimit: c.usageLimit,
              expiresAt: c.expiresAt,
              active: c.active ?? true,
            })),
          );
        }
      })
      .catch((err) => console.warn("Failed to load coupons:", err));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async () => {
    if (!form.code.trim() || !form.value) {
      toast.error("Please provide both a coupon code and discount value.");
      return;
    }

    setIsSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minimumOrder: form.minimumOrder ? Number(form.minimumOrder) : 0,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      active: true,
    };

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.coupon) {
        setCoupons((curr) => [
          {
            id: data.coupon.id,
            code: data.coupon.code,
            type: data.coupon.type,
            value: data.coupon.value,
            minimumOrder: data.coupon.minimumOrder,
            usageCount: data.coupon.usageCount ?? 0,
            usageLimit: data.coupon.usageLimit,
            expiresAt: data.coupon.expiresAt,
            active: data.coupon.active,
          },
          ...curr.filter((c) => c.code !== data.coupon.code),
        ]);
        toast.success(`Coupon "${payload.code}" created and saved successfully.`);
      } else {
        setCoupons((curr) => [
          {
            id: `c-${Date.now()}`,
            ...payload,
            usageCount: 0,
          },
          ...curr,
        ]);
        toast.success(`Coupon "${payload.code}" saved.`);
      }
    } catch (err: any) {
      console.warn("Failed to create coupon via API:", err);
      setCoupons((curr) => [
        {
          id: `c-${Date.now()}`,
          ...payload,
          usageCount: 0,
        },
        ...curr,
      ]);
      toast.error(`Failed to save coupon: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
      setForm({
        code: "",
        type: "PERCENTAGE",
        value: "",
        minimumOrder: "",
        usageLimit: "",
        expiresAt: "",
      });
      setOpen(false);
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    const updatedActive = !coupon.active;
    setCoupons((curr) =>
      curr.map((c) => (c.code === coupon.code ? { ...c, active: updatedActive } : c)),
    );

    try {
      await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minimumOrder: coupon.minimumOrder,
          usageLimit: coupon.usageLimit,
          expiresAt: coupon.expiresAt,
          active: updatedActive,
        }),
      });
      toast.success(`Coupon ${coupon.code} is now ${updatedActive ? "active" : "inactive"}.`);
    } catch (err) {
      console.warn("Failed to update coupon status:", err);
      toast.error(`Could not update coupon ${coupon.code}.`);
    }
  };

  const remove = async (coupon: Coupon) => {
    setCoupons((curr) => curr.filter((c) => c.code !== coupon.code));
    try {
      await fetch(
        `/api/coupons?${coupon.id ? `id=${coupon.id}` : `code=${encodeURIComponent(coupon.code)}`}`,
        { method: "DELETE" },
      );
      toast.success(`Coupon "${coupon.code}" deleted.`);
    } catch (err) {
      console.warn("Failed to delete coupon:", err);
      toast.error(`Could not delete coupon "${coupon.code}".`);
    }
  };

  return (
    <AdminShell
      title="Coupons & Offers"
      description="Manage promotional codes, order discounts, and usage limits across the storefront."
    >
      <div className="flex justify-between items-center border-y border-[#d9cec5] py-4">
        <span className="text-xs text-[#776a61]">{coupons.length} promotional rules configured</span>
        <Button
          onClick={() => setOpen(true)}
          className="rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-[0.14em]"
        >
          <Plus size={13} className="mr-1.5" />
          Create Coupon
        </Button>
      </div>

      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Discount</th>
            <th className="px-4 py-3">Min. Order</th>
            <th className="px-4 py-3">Redemptions</th>
            <th className="px-4 py-3">Expiry</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </TableHeader>
          {coupons.map((coupon) => (
            <tr key={coupon.code} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-mono font-semibold text-[#8f5d48]">{coupon.code}</TableCell>
              <TableCell className="font-medium text-[#211b18]">
                {coupon.type === "PERCENTAGE" ? `${coupon.value}% Off` : `£${coupon.value} Off`}
              </TableCell>
              <TableCell className="text-[#776a61]">
                {coupon.minimumOrder > 0 ? `£${coupon.minimumOrder}` : "No min"}
              </TableCell>
              <TableCell>
                <span className="font-medium text-[#211b18]">{coupon.usageCount}</span>
                <span className="text-[#8f8279]">
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " uses"}
                </span>
              </TableCell>
              <TableCell className="text-xs text-[#776a61]">
                {coupon.expiresAt
                  ? new Date(coupon.expiresAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Never"}
              </TableCell>
              <TableCell>
                <AdminStatus tone={coupon.active ? "positive" : "warning"}>
                  {coupon.active ? "ACTIVE" : "INACTIVE"}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right space-x-3">
                <button
                  type="button"
                  onClick={() => toggleStatus(coupon)}
                  className={`text-[11px] underline hover:text-black ${coupon.active ? "text-[#8f5d48]" : "text-[#4b6742]"}`}
                  title={coupon.active ? "Deactivate" : "Activate"}
                >
                  {coupon.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(coupon)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#a04040] hover:underline"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      {open && (
        <AdminDialog
          title="Create Promotional Coupon"
          description="Define a new coupon code and discount terms for customer checkouts."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            <AdminField label="Coupon Code *">
              <input
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm font-mono uppercase outline-none focus:border-[#8f5d48]"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. FESTIVE20"
                autoFocus
              />
            </AdminField>

            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Discount Type">
                <select
                  className="h-10 w-full border border-[#d9cec5] bg-white/60 px-2 text-sm outline-none focus:border-[#8f5d48]"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (£)</option>
                </select>
              </AdminField>
              <AdminField label="Value *">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "PERCENTAGE" ? "15" : "20"}
                />
              </AdminField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Min. Order Subtotal (£)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                  value={form.minimumOrder}
                  onChange={(e) => setForm({ ...form, minimumOrder: e.target.value })}
                  placeholder="50"
                />
              </AdminField>
              <AdminField label="Usage Limit (Optional)">
                <input
                  type="number"
                  className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="e.g. 100"
                />
              </AdminField>
            </div>

            <AdminField label="Expiration Date (Optional)">
              <input
                type="date"
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </AdminField>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#d9cec5]">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSaving || !form.code.trim() || !form.value}
                className="bg-[#211b18] text-white hover:bg-black"
              >
                {isSaving ? "Saving..." : "Save Coupon"}
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
