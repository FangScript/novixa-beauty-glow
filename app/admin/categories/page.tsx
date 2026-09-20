"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminDialog,
  AdminField,
  AdminShell,
  AdminTable,
  TableCell,
  TableHeader,
} from "@/components/admin";

type Category = { id: string; name: string; slug: string; products: number; status: "Active" };

const initialCategories: Category[] = [
  { id: "cat-1", name: "Perfumes", slug: "perfume", products: 12, status: "Active" },
  { id: "cat-2", name: "Makeup", slug: "makeup", products: 6, status: "Active" },
  { id: "cat-3", name: "Grooming", slug: "grooming", products: 4, status: "Active" },
  { id: "cat-4", name: "Bundles", slug: "bundle", products: 4, status: "Active" },
  { id: "cat-5", name: "Accessories", slug: "accessories", products: 2, status: "Active" },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const add = () => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setCategories((current) => [
      ...current,
      { id: `cat-${Date.now()}`, name: name.trim(), slug, products: 0, status: "Active" },
    ]);
    setName("");
    setOpen(false);
  };

  return (
    <AdminShell
      title="Categories"
      description="Manage the database taxonomy used by navigation, filtering, and catalogue organization."
    >
      <div className="flex justify-between items-center border-y border-[#d9cec5] py-4">
        <span className="text-xs text-[#776a61]">{categories.length} active classifications</span>
        <Button
          onClick={() => setOpen(true)}
          className="rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-[0.14em]"
        >
          + Add Category
        </Button>
      </div>

      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Category Name</th>
            <th className="px-4 py-3">URL Slug</th>
            <th className="px-4 py-3">Linked Products</th>
            <th className="px-4 py-3">Status</th>
          </TableHeader>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium text-[#211b18]">{category.name}</TableCell>
              <TableCell className="text-[#8f8279]">/{category.slug}</TableCell>
              <TableCell className="font-semibold">{category.products} items</TableCell>
              <TableCell>
                <span className="bg-[#dfe8d9] text-[#4b6742] px-2 py-0.5 text-[9px] uppercase font-medium">
                  {category.status}
                </span>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      {open && (
        <AdminDialog
          title="Add New Category"
          description="Create a taxonomy entry for storefront filtering and products."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            <AdminField label="Category Title">
              <input
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Skin Care Essentials"
              />
            </AdminField>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#d9cec5]">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={add} className="bg-[#211b18] text-white hover:bg-black">
                Save Category
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
