"use client";

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
import { products as seedProducts } from "@/lib/products/catalogue";

type Inventory = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  lowStockAt: number;
};

const initialInventory: Inventory[] = seedProducts.map((p) => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  category: p.category,
  stock: p.stock,
  lowStockAt: 8,
}));

export default function AdminInventoryPage() {
  const [records, setRecords] = useState<Inventory[]>(initialInventory);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Inventory | null>(null);
  const [newStock, setNewStock] = useState<number>(0);

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

  const low = records.filter((product) => product.stock <= product.lowStockAt);

  const openAdjust = (item: Inventory) => {
    setSelected(item);
    setNewStock(item.stock);
  };

  const saveStock = () => {
    if (!selected || newStock < 0) return;
    setRecords((current) =>
      current.map((p) => (p.id === selected.id ? { ...p, stock: newStock } : p)),
    );
    setSelected(null);
  };

  return (
    <AdminShell
      title="Inventory"
      description="Monitor SKU availability, threshold alerts, and warehouse readiness."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Tracked SKUs"
          value={String(records.length)}
          detail="All active product variations"
        />
        <MetricCard
          label="Low stock items"
          value={String(low.length)}
          detail="Stock count ≤ threshold"
          tone={low.length > 0 ? "dark" : "light"}
        />
        <MetricCard
          label="Total units in stock"
          value={String(records.reduce((sum, p) => sum + p.stock, 0))}
          detail="Across all active warehouses"
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 border-y border-[#d9cec5] py-4 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU or product title"
          className="h-10 flex-1 border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 border border-[#d9cec5] bg-white/60 px-3 text-xs"
        >
          <option value="all">All stock states</option>
          <option value="low">Low stock only</option>
          <option value="healthy">Healthy stock only</option>
        </select>
      </div>

      <div className="mt-4">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Product Name</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Units in Stock</th>
            <th className="px-4 py-3">Threshold</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Adjustment</th>
          </TableHeader>
          {filtered.map((item) => (
            <tr key={item.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium text-[#211b18]">{item.name}</TableCell>
              <TableCell className="text-[#8f8279]">{item.sku}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell className="font-semibold">{item.stock}</TableCell>
              <TableCell className="text-muted-foreground">{item.lowStockAt}</TableCell>
              <TableCell>
                <AdminStatus tone={item.stock <= item.lowStockAt ? "warning" : "positive"}>
                  {item.stock <= item.lowStockAt ? "Low Stock" : "In Stock"}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => openAdjust(item)}
                  className="text-xs text-[#8f5d48] underline hover:text-black"
                >
                  Adjust Stock
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      {selected && (
        <AdminDialog
          title={`Adjust Stock: ${selected.name}`}
          description={`SKU: ${selected.sku} · Current stock: ${selected.stock}`}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4">
            <AdminField label="New Stock Level (Units)">
              <input
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
              />
            </AdminField>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button onClick={saveStock} className="bg-[#211b18] text-white hover:bg-black">
                Update Stock
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
