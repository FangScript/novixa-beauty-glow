"use client";

import { useState } from "react";
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
  code: string;
  type: string;
  value: number;
  minimum: number;
  uses: number;
  usageLimit: number | null;
  expiry: string;
  active: boolean;
};

const initialCoupons: Coupon[] = [
  {
    code: "GLOW15",
    type: "PERCENTAGE",
    value: 15,
    minimum: 3000,
    uses: 48,
    usageLimit: 200,
    expiry: "31 Dec 2026",
    active: true,
  },
  {
    code: "LUXE1000",
    type: "FIXED",
    value: 1000,
    minimum: 8000,
    uses: 22,
    usageLimit: 100,
    expiry: "30 Nov 2026",
    active: true,
  },
  {
    code: "WELCOME10",
    type: "PERCENTAGE",
    value: 10,
    minimum: 2000,
    uses: 115,
    usageLimit: null,
    expiry: "Never",
    active: true,
  },
];

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");

  const add = () => {
    if (!code.trim() || !value) return;
    const newCoupon: Coupon = {
      code: code.trim().toUpperCase(),
      type: "PERCENTAGE",
      value: Number(value),
      minimum: 2500,
      uses: 0,
      usageLimit: 100,
      expiry: "31 Dec 2026",
      active: true,
    };
    setCoupons((current) => [newCoupon, ...current]);
    setCode("");
    setValue("");
    setOpen(false);
  };

  const toggle = (codeToToggle: string) => {
    setCoupons((current) =>
      current.map((c) => (c.code === codeToToggle ? { ...c, active: !c.active } : c)),
    );
  };

  return (
    <AdminShell
      title="Coupons"
      description="Manage promotional discount codes, minimum spends, and redemptions."
    >
      <div className="flex justify-between items-center border-y border-[#d9cec5] py-4">
        <span className="text-xs text-[#776a61]">{coupons.length} promotional campaigns</span>
        <Button
          onClick={() => setOpen(true)}
          className="rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-[0.14em]"
        >
          + Create Coupon
        </Button>
      </div>

      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Coupon Code</th>
            <th className="px-4 py-3">Discount</th>
            <th className="px-4 py-3">Min. Order</th>
            <th className="px-4 py-3">Redemptions</th>
            <th className="px-4 py-3">Expiry</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </TableHeader>
          {coupons.map((coupon) => (
            <tr key={coupon.code} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-mono font-bold text-[#8f5d48]">{coupon.code}</TableCell>
              <TableCell className="font-semibold">
                {coupon.type === "PERCENTAGE" ? `${coupon.value}% off` : `Rs. ${coupon.value}`}
              </TableCell>
              <TableCell className="text-[#776a61]">Rs. {coupon.minimum}</TableCell>
              <TableCell>
                {coupon.uses} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ""}
              </TableCell>
              <TableCell className="text-[#776a61]">{coupon.expiry}</TableCell>
              <TableCell>
                <AdminStatus tone={coupon.active ? "positive" : "neutral"}>
                  {coupon.active ? "Active" : "Disabled"}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => toggle(coupon.code)}
                  className="text-xs text-[#8f5d48] underline hover:text-black"
                >
                  {coupon.active ? "Deactivate" : "Activate"}
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      {open && (
        <AdminDialog
          title="Create Coupon Code"
          description="Define promo code and percentage discount rule."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            <AdminField label="Coupon Code">
              <input
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none uppercase font-mono focus:border-[#8f5d48]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SUMMER20"
              />
            </AdminField>
            <AdminField label="Discount Value (%)">
              <input
                type="number"
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="15"
              />
            </AdminField>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#d9cec5]">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={add} className="bg-[#211b18] text-white hover:bg-black">
                Save Coupon
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
