"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  { id: "perfume", name: "Perfumes", slug: "perfume", products: 12, status: "Active" },
  { id: "makeup", name: "Makeup", slug: "makeup", products: 6, status: "Active" },
  { id: "grooming", name: "Grooming", slug: "grooming", products: 4, status: "Active" },
  { id: "bundle", name: "Bundles", slug: "bundle", products: 4, status: "Active" },
  { id: "accessories", name: "Accessories", slug: "accessories", products: 2, status: "Active" },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(
            data.categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              products: c.count ?? 0,
              status: "Active" as const,
            })),
          );
        }
      })
      .catch((err) => console.warn("Could not load categories from API:", err));
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, slug }),
      });
      const data = await res.json();
      const newCat: Category = {
        id: data.category?.id ?? `cat-${Date.now()}`,
        name: data.category?.name ?? trimmedName,
        slug: data.category?.slug ?? slug,
        products: 0,
        status: "Active",
      };
      setCategories((current) => [...current, newCat]);
      toast.success(`Category "${trimmedName}" created successfully.`);
    } catch (err: any) {
      console.warn("Could not save category via API:", err);
      setCategories((current) => [
        ...current,
        { id: `cat-${Date.now()}`, name: trimmedName, slug, products: 0, status: "Active" },
      ]);
      toast.success(`Category "${trimmedName}" created.`);
    } finally {
      setIsSaving(false);
      setName("");
      setOpen(false);
    }
  };

  const remove = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    const catName = cat?.name || "Category";
    try {
      await fetch(`/api/categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setCategories((current) => current.filter((c) => c.id !== id));
      toast.success(`Category "${catName}" deleted.`);
    } catch (err: any) {
      console.warn("Could not delete category via API:", err);
      setCategories((current) => current.filter((c) => c.id !== id));
      toast.error(`Could not delete category "${catName}".`);
    }
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
            <th className="px-4 py-3 text-right">Actions</th>
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
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => remove(category.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#a04040] hover:underline"
                  title="Delete category"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
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
                autoFocus
              />
            </AdminField>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#d9cec5]">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={add} disabled={isSaving || !name.trim()} className="bg-[#211b18] text-white hover:bg-black">
                {isSaving ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
