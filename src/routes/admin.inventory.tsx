import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminDialog,
  AdminField,
  AdminShell,
  AdminStatus,
  AdminTable,
  MetricCard,
  TableCell,
  TableHeader,
} from "@/components/admin";
import { products } from "@/lib/commerce";
export const Route = createFileRoute("/admin/inventory")({ component: AdminInventory });
function AdminInventory() {
  const [records, setRecords] = useState(products.map((product) => ({ ...product })));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<(typeof records)[number] | null>(null);
  const filtered = useMemo(
    () =>
      records.filter(
        (product) =>
          `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" ||
            (filter === "low" && product.stock <= 8) ||
            (filter === "healthy" && product.stock > 8)),
      ),
    [records, query, filter],
  );
  const saveStock = (stock: number) => {
    if (!selected || !Number.isInteger(stock) || stock < 0) return;
    setRecords((current) =>
      current.map((product) => (product.id === selected.id ? { ...product, stock } : product)),
    );
    setSelected(null);
  };
  const low = records.filter((product) => product.stock <= 8);
  return (
    <AdminShell
      title="Inventory"
      description="Monitor stock health, adjust available units, and identify products that need replenishment."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Tracked SKUs"
          value={String(records.length)}
          detail="Across all categories"
        />
        <MetricCard
          label="Low stock"
          value={String(low.length)}
          detail="8 units or fewer"
          tone="dark"
        />
        <MetricCard
          label="Out of stock"
          value={String(records.filter((p) => p.stock === 0).length)}
          detail="Unavailable products"
        />
      </div>
      <div className="mt-8 flex flex-col gap-3 border-y border-[#d9cec5] py-4 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product or SKU"
          className="h-10 flex-1 border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 border border-[#d9cec5] bg-white/60 px-3 text-xs"
        >
          <option value="all">All inventory</option>
          <option value="low">Low stock</option>
          <option value="healthy">Healthy stock</option>
        </select>
      </div>
      <div className="mt-4">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Available</th>
            <th className="px-4 py-3">Inventory state</th>
            <th className="px-4 py-3" />
          </TableHeader>
          {filtered.map((product) => (
            <tr key={product.id} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell>{product.name}</TableCell>
              <TableCell className="text-[#776a61]">{product.sku}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell className="font-medium">{product.stock}</TableCell>
              <TableCell>
                <AdminStatus
                  tone={product.stock <= 5 ? "danger" : product.stock <= 8 ? "warning" : "positive"}
                >
                  {product.stock <= 5 ? "Low" : product.stock <= 8 ? "Watch" : "Healthy"}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                <button onClick={() => setSelected(product)} className="text-[#8f5d48] underline">
                  Adjust
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
      {selected && (
        <StockDialog product={selected} onClose={() => setSelected(null)} onSave={saveStock} />
      )}
    </AdminShell>
  );
}
function StockDialog({
  product,
  onClose,
  onSave,
}: {
  product: { name: string; stock: number };
  onClose: () => void;
  onSave: (stock: number) => void;
}) {
  const [stock, setStock] = useState(String(product.stock));
  return (
    <AdminDialog title="Adjust inventory" description={product.name} onClose={onClose}>
      <AdminField label="Available units" hint="Use a whole number">
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm"
        />
      </AdminField>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} className="rounded-none text-[10px] uppercase">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(Number(stock))}
          className="rounded-none text-[10px] uppercase"
        >
          Save stock
        </Button>
      </div>
    </AdminDialog>
  );
}
