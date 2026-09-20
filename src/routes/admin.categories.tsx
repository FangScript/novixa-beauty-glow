import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AdminDialog,
  AdminField,
  AdminShell,
  AdminTable,
  TableCell,
  TableHeader,
} from "@/components/admin";
import { createAdminCategory, listAdminCategories } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/categories")({ component: AdminCategories });
type Category = { id: string; name: string; slug: string; products: number; status: "Active" };
function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const list = useServerFn(listAdminCategories);
  const create = useServerFn(createAdminCategory);
  useEffect(() => {
    list().then(setCategories);
  }, [list]);
  const add = async () => {
    if (!name.trim()) return;
    const category = await create({ data: { name } });
    setCategories((current) => [...current, category]);
    setName("");
    setOpen(false);
  };
  return (
    <AdminShell
      title="Categories"
      description="Manage the database taxonomy used by navigation, filtering, and catalogue organization."
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
          </TableHeader>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>/{category.slug}</TableCell>
              <TableCell>{category.products}</TableCell>
              <TableCell>{category.status}</TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
      {open && (
        <AdminDialog
          title="Add category"
          description="Create a persistent category record."
          onClose={() => setOpen(false)}
        >
          <AdminField label="Category name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm"
              placeholder="Hair care"
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
              Create category
            </Button>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
