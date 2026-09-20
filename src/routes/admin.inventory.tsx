import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { listAdminInventory, updateAdminInventory } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/inventory")({ component: AdminInventory });
type Inventory = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  lowStockAt: number;
};
function AdminInventory() {
  const [records, setRecords] = useState<Inventory[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(listAdminInventory);
  const update = useServerFn(updateAdminInventory);
  useEffect(() => {
    list()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [list]);
  const filtered = useMemo(
    () =>
      records.filter(
        (product) =>
          `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" ||
            (filter === "low" && product.stock <= product.lowStockAt) ||
            (filter === "healthy" && product.stock > product.lowStockAt)),
      ),
    [records, query, filter],
  );
  const saveStock = async (stock: number) => {
    if (!selected || !Number.isInteger(stock) || stock < 0) return;
    await update({ data: { id: selected.id, stock } });
    setRecords((current) =>
      current.map((product) => (product.id === selected.id ? { ...product, stock } : product)),
    );
    setSelected(null);
  };
  const low = records.filter((product) => product.stock <= product.lowStockAt);
  return (
    <AdminShell
      title="Inventory"
      description="Monitor and adjust persistent PostgreSQL stock levels with administrator audit attribution."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Tracked SKUs"
          value={String(records.length)}
          detail="Database products"
        />
        <MetricCard
          label="Low stock"
          value={String(low.length)}
          detail="At configured threshold"
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
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3" />
          </TableHeader>
          {loading ? (
            <tr>
              <TableCell>Loading inventory…</TableCell>
            </tr>
          ) : (
            filtered.map((product) => (
              <tr key={product.id} className="border-b border-[#e7ddd5] last:border-0">
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <AdminStatus
                    tone={
                      product.stock === 0
                        ? "danger"
                        : product.stock <= product.lowStockAt
                          ? "warning"
                          : "positive"
                    }
                  >
                    {product.stock === 0
                      ? "Out"
                      : product.stock <= product.lowStockAt
                        ? "Low"
                        : "Healthy"}
                  </AdminStatus>
                </TableCell>
                <TableCell className="text-right">
                  <button onClick={() => setSelected(product)} className="text-[#8f5d48] underline">
                    Adjust
                  </button>
                </TableCell>
              </tr>
            ))
          )}
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
  product: Inventory;
  onClose: () => void;
  onSave: (stock: number) => Promise<void>;
}) {
  const [stock, setStock] = useState(String(product.stock));
  return (
    <AdminDialog
      title="Adjust inventory"
      description={`${product.name} · ${product.sku}`}
      onClose={onClose}
    >
      <AdminField label="Available units">
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
