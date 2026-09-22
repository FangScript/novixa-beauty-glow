import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { createAdminCoupon, listAdminCoupons, toggleAdminCoupon } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/coupons")({ component: AdminCoupons });
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
function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const list = useServerFn(listAdminCoupons);
  const create = useServerFn(createAdminCoupon);
  const toggle = useServerFn(toggleAdminCoupon);
  useEffect(() => {
    list().then(setCoupons);
  }, [list]);
  const add = async () => {
    const coupon = await create({ data: { code, value: Number(value) } });
    setCoupons((current) => [coupon, ...current]);
    setCode("");
    setValue("");
    setOpen(false);
  };
  const switchState = async (coupon: Coupon) => {
    const next = await toggle({ data: { code: coupon.code, active: !coupon.active } });
    setCoupons((current) =>
      current.map((item) => (item.code === next.code ? { ...item, active: next.active } : item)),
    );
  };
  return (
    <AdminShell
      title="Coupons"
      description="Manage persistent discount rules, usage, and activation state."
    >
      <div className="flex justify-end border-y border-[#d9cec5] py-4">
        <Button onClick={() => setOpen(true)} className="rounded-none text-[10px] uppercase">
          + Create coupon
        </Button>
      </div>
      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Usage</th>
            <th className="px-4 py-3">Expiry</th>
            <th className="px-4 py-3">Status</th>
          </TableHeader>
          {coupons.map((coupon) => (
            <tr key={coupon.code} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium text-[#8f5d48]">{coupon.code}</TableCell>
              <TableCell>{coupon.type}</TableCell>
              <TableCell>
                {coupon.value}
                {coupon.type === "PERCENTAGE" ? "%" : ""}
              </TableCell>
              <TableCell>
                {coupon.uses}
                {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
              </TableCell>
              <TableCell>
                {coupon.expiry === "Not set"
                  ? coupon.expiry
                  : new Date(coupon.expiry).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell>
                <button onClick={() => switchState(coupon)}>
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
          description="Create a persistent inactive percentage coupon."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-5">
            <AdminField label="Coupon code">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm uppercase"
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
                Create coupon
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
