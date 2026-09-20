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
export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });
type Category = { name: string; slug: string; products: number; status: "Active" | "Draft" };
function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([
    { name: "Perfumes", slug: "perfume", products: 12, status: "Active" },
    { name: "Makeup", slug: "makeup", products: 6, status: "Active" },
    { name: "Grooming", slug: "grooming", products: 4, status: "Active" },
    { name: "Bundles", slug: "bundle", products: 4, status: "Active" },
    { name: "Accessories", slug: "accessories", products: 2, status: "Active" },
  ]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((current) => [
      ...current,
      {
        name: trimmed,
        slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        products: 0,
        status: "Draft",
      },
    ]);
    setName("");
    setOpen(false);
  };
  return (
    <AdminShell
      title="Categories"
      description="Manage the taxonomy that powers navigation, filtering, and catalogue organization."
    >
      <div className="flex justify-end border-y border-[#d9cec5] py-4">
        <Button
          onClick={() => setOpen(true)}
          className="rounded-none text-[10px] uppercase tracking-[0.12em]"
        >
          + Add category
        </Button>
      </div>
      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Products</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </TableHeader>
          {categories.map((category) => (
            <tr key={category.slug} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-[#776a61]">/{category.slug}</TableCell>
              <TableCell>{category.products}</TableCell>
              <TableCell>
                <AdminStatus tone={category.status === "Active" ? "positive" : "warning"}>
                  {category.status}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                <button className="text-[#8f5d48] underline">Edit</button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
      {open && (
        <AdminDialog
          title="Add category"
          description="New categories begin as drafts until assigned products are published."
          onClose={() => setOpen(false)}
        >
          <AdminField label="Category name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm"
              placeholder="e.g. Hair care"
            />
          </AdminField>
          <div className="mt-6 flex justify-end gap-3">
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
        </AdminDialog>
      )}
    </AdminShell>
  );
}
