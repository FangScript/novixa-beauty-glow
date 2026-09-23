"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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

type Bundle = {
  id: string;
  name: string;
  products: number;
  price: number;
  originalValue: number;
  status: string;
  description?: string;
};

const initialBundles: Bundle[] = [
  {
    id: "b1",
    name: "Complete Glam Makeup Bundle",
    products: 4,
    price: 115,
    originalValue: 145,
    status: "ACTIVE",
  },
  {
    id: "b2",
    name: "Gentleman Grooming Ritual",
    products: 3,
    price: 95,
    originalValue: 120,
    status: "ACTIVE",
  },
  {
    id: "b3",
    name: "Duo Luxe Fragrance Wardrobe",
    products: 2,
    price: 145,
    originalValue: 180,
    status: "ACTIVE",
  },
  {
    id: "b4",
    name: "Flawless Base & Tool Kit",
    products: 3,
    price: 65,
    originalValue: 85,
    status: "ACTIVE",
  },
];

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>(initialBundles);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    originalValue: "",
  });

  useEffect(() => {
    fetch("/api/bundles")
      .then((res) => res.json())
      .then((data) => {
        if (data.bundles && Array.isArray(data.bundles) && data.bundles.length > 0) {
          setBundles(data.bundles);
        }
      })
      .catch((err) => console.warn("Could not load bundles from API:", err));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.price || !form.originalValue) {
      toast.error("Please fill in bundle name, price, and original value.");
      return;
    }

    setIsSaving(true);
    const bundleName = form.name.trim();
    const numPrice = Number(form.price);
    const numOrig = Number(form.originalValue);

    try {
      const res = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bundleName,
          description: form.description.trim(),
          price: numPrice,
          originalValue: numOrig,
          items: [],
        }),
      });

      const data = await res.json();
      if (data.ok && data.bundle) {
        setBundles((curr) => [
          {
            id: data.bundle.id,
            name: data.bundle.name,
            products: data.bundle.items?.length ?? 0,
            price: data.bundle.price,
            originalValue: data.bundle.originalValue,
            status: data.bundle.status,
            description: data.bundle.description,
          },
          ...curr,
        ]);
        toast.success(`Bundle "${bundleName}" created and saved successfully.`);
      } else {
        // Fallback local update
        setBundles((curr) => [
          {
            id: `b-${Date.now()}`,
            name: bundleName,
            products: 0,
            price: numPrice,
            originalValue: numOrig,
            status: "ACTIVE",
            description: form.description.trim(),
          },
          ...curr,
        ]);
        toast.success(`Bundle "${bundleName}" saved locally.`);
      }
    } catch (err: any) {
      console.warn("Could not save bundle:", err);
      toast.error(`Failed to save bundle: ${err.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
      setForm({ name: "", description: "", price: "", originalValue: "" });
      setOpen(false);
    }
  };

  const archive = async (id: string) => {
    const b = bundles.find((x) => x.id === id);
    const name = b?.name || "Bundle";
    try {
      await fetch(`/api/bundles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setBundles((curr) => curr.filter((item) => item.id !== id));
      toast.success(`"${name}" has been archived.`);
    } catch (err: any) {
      console.warn("Could not archive bundle:", err);
      setBundles((curr) => curr.filter((item) => item.id !== id));
      toast.error(`Could not archive "${name}": ${err.message || "Unknown error"}`);
    }
  };

  return (
    <AdminShell
      title="Bundles"
      description="Review curated luxury offers and bundle savings from the commerce database."
    >
      <div className="flex justify-between items-center border-y border-[#d9cec5] py-4">
        <span className="text-xs text-[#776a61]">{bundles.length} bundles configured</span>
        <Button
          onClick={() => setOpen(true)}
          className="rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-[0.14em]"
        >
          + Create Bundle
        </Button>
      </div>

      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Bundle Name</th>
            <th className="px-4 py-3">Included Products</th>
            <th className="px-4 py-3">Bundle Price</th>
            <th className="px-4 py-3">Original Value</th>
            <th className="px-4 py-3">Savings</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </TableHeader>
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium text-[#211b18]">{bundle.name}</TableCell>
              <TableCell className="text-[#776a61]">{bundle.products} items</TableCell>
              <TableCell className="font-semibold">£{bundle.price.toLocaleString("en-GB")}</TableCell>
              <TableCell className="text-[#776a61] line-through">
                £{bundle.originalValue.toLocaleString("en-GB")}
              </TableCell>
              <TableCell className="text-[#4b6742] font-semibold">
                {bundle.originalValue
                  ? `${Math.round((1 - bundle.price / bundle.originalValue) * 100)}% off`
                  : "—"}
              </TableCell>
              <TableCell>
                <AdminStatus tone={bundle.status === "ACTIVE" ? "positive" : "warning"}>
                  {bundle.status}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => archive(bundle.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#a04040] hover:underline"
                  title="Archive bundle"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Archive
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      {open && (
        <AdminDialog
          title="Create Luxury Bundle"
          description="Group complimentary catalogue items into a high-value promotional set."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            <AdminField label="Bundle Name">
              <input
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Amber & Silk Evening Trio"
                autoFocus
              />
            </AdminField>
            <AdminField label="Description">
              <textarea
                className="h-20 w-full border border-[#d9cec5] bg-white/60 p-3 text-sm outline-none focus:border-[#8f5d48]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Briefly describe the curated bundle..."
              />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Bundle Price (£)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="95"
                />
              </AdminField>
              <AdminField label="Original Value (£)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                  value={form.originalValue}
                  onChange={(e) => setForm({ ...form, originalValue: e.target.value })}
                  placeholder="120"
                />
              </AdminField>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#d9cec5]">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSaving || !form.name.trim() || !form.price || !form.originalValue}
                className="bg-[#211b18] text-white hover:bg-black"
              >
                {isSaving ? "Saving..." : "Create Bundle"}
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
