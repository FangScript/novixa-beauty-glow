import { createFileRoute } from "@tanstack/react-router";
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
export const Route = createFileRoute("/admin/coupons")({ component: AdminCoupons });
type Coupon = {
  code: string;
  type: "Percentage" | "Fixed";
  value: string;
  minimum: string;
  uses: string;
  expiry: string;
  active: boolean;
};
function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      code: "GLOW10",
      type: "Percentage",
      value: "10%",
      minimum: "Rs. 2,000",
      uses: "184 / 500",
      expiry: "31 Dec 2026",
      active: true,
    },
    {
      code: "WELCOME500",
      type: "Fixed",
      value: "Rs. 500",
      minimum: "Rs. 3,000",
      uses: "62 / 250",
      expiry: "31 Oct 2026",
      active: true,
    },
    {
      code: "FESTIVE25",
      type: "Percentage",
      value: "25%",
      minimum: "Rs. 5,000",
      uses: "0 / 100",
      expiry: "15 Oct 2026",
      active: false,
    },
  ]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const add = () => {
    if (!code.trim() || !value.trim()) return;
    setCoupons((current) => [
      {
        code: code.trim().toUpperCase(),
        type: "Percentage",
        value: `${value}%`,
        minimum: "Rs. 0",
        uses: "0 / 100",
        expiry: "Not set",
        active: false,
      },
      ...current,
    ]);
    setCode("");
    setValue("");
    setOpen(false);
  };
  const toggle = (code: string) =>
    setCoupons((current) =>
      current.map((coupon) =>
        coupon.code === code ? { ...coupon, active: !coupon.active } : coupon,
      ),
    );
  return (
    <AdminShell
      title="Coupons"
      description="Manage percentage and fixed discounts with order minimums, expiry dates, and usage limits."
    >
      <div className="flex justify-end border-y border-[#d9cec5] py-4">
        <Button
          onClick={() => setOpen(true)}
          className="rounded-none text-[10px] uppercase tracking-[0.12em]"
        >
          + Create coupon
        </Button>
      </div>
      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Minimum order</th>
            <th className="px-4 py-3">Usage</th>
            <th className="px-4 py-3">Expiry</th>
            <th className="px-4 py-3">Status</th>
          </TableHeader>
          {coupons.map((coupon) => (
            <tr key={coupon.code} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium tracking-[0.12em] text-[#8f5d48]">
                {coupon.code}
              </TableCell>
              <TableCell>{coupon.type}</TableCell>
              <TableCell>{coupon.value}</TableCell>
              <TableCell>{coupon.minimum}</TableCell>
              <TableCell>{coupon.uses}</TableCell>
              <TableCell>{coupon.expiry}</TableCell>
              <TableCell>
                <button onClick={() => toggle(coupon.code)}>
                  <AdminStatus tone={coupon.active ? "positive" : "warning"}>
                    {coupon.active ? "Active" : "Draft"}
                  </AdminStatus>
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
      {open && (
        <AdminDialog
          title="Create coupon"
          description="New coupons begin inactive until their rules are fully configured."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-5">
            <AdminField label="Coupon code">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm uppercase"
                placeholder="GLOW15"
              />
            </AdminField>
            <AdminField label="Percentage discount">
              <input
                type="number"
                min="1"
                max="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm"
                placeholder="15"
              />
            </AdminField>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-none text-[10px] uppercase"
              >
                Cancel
              </Button>
              <Button onClick={add} className="rounded-none text-[10px] uppercase">
                Create draft
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
