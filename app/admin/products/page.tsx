"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ProductImageUpload } from "@/components/admin/ProductImageUpload";
import {
  products as seedProducts,
  productSchema,
  type Product,
  type ProductCategory,
  type Gender,
} from "@/lib/products/catalogue";

type ProductForm = {
  name: string;
  sku: string;
  description: string;
  price: string;
  salePrice: string;
  category: ProductCategory;
  gender: Gender;
  stock: string;
  badge: string;
  tags: string;
  images: string[];
};

const blankForm: ProductForm = {
  name: "",
  sku: "",
  description: "",
  price: "",
  salePrice: "",
  category: "perfume",
  gender: "unisex",
  stock: "0",
  badge: "",
  tags: "",
  images: [],
};

const inputClass =
  "h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]";

function toForm(product: Product): ProductForm {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: String(product.price),
    salePrice: product.salePrice ? String(product.salePrice) : "",
    category: product.category,
    gender: product.gender,
    stock: String(product.stock),
    badge: product.badge ?? "",
    tags: product.tags.join(", "),
    images: product.images || [],
  };
}

export default function AdminProductsPage() {
  const [records, setRecords] = useState<Product[]>(seedProducts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "healthy">("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          setRecords(data.products);
        }
      })
      .catch((err) => console.warn("Could not load products from API:", err));
  }, []);

  const filtered = useMemo(
    () =>
      records.filter((product) => {
        const matchesQuery =
          `${product.name} ${product.sku} ${product.category} ${product.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesCategory = category === "all" || product.category === category;
        const matchesStock =
          stockFilter === "all" || (stockFilter === "low" ? product.stock <= 8 : product.stock > 8);
        return matchesQuery && matchesCategory && matchesStock;
      }),
    [records, query, category, stockFilter],
  );

  const openCreate = () => {
    setSelected(null);
    setCreateOpen(true);
    setForm(blankForm);
    setError("");
  };

  const openEdit = (product: Product) => {
    setSelected(product);
    setForm(toForm(product));
    setError("");
  };

  const save = async () => {
    setError("");
    const finalImages = form.images.length > 0 ? form.images : ["/images/product-perfume.jpg"];

    const parsed = productSchema.safeParse({
      id: selected?.id ?? `p-${Date.now()}`,
      name: form.name.trim(),
      slug: (selected?.slug ?? form.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      description: form.description.trim() || "Luxury formulation crafted by NOVIXA.",
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      gender: form.gender,
      category: form.category,
      brand: selected?.brand ?? "NOVIXA",
      sku: form.sku.trim().toUpperCase(),
      images: finalImages,
      stock: Number(form.stock),
      rating: selected?.rating ?? 5.0,
      reviewCount: selected?.reviewCount ?? 0,
      badge: form.badge.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid product configuration.");
      return;
    }

    const savedProduct = parsed.data;
    setIsSaving(true);

    try {
      const isEditing = Boolean(selected?.id);
      const res = await fetch("/api/products", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...savedProduct,
          id: selected?.id,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to save product in database.");
      }

      setRecords((current) =>
        current.some((p) => p.id === savedProduct.id)
          ? current.map((p) => (p.id === savedProduct.id ? savedProduct : p))
          : [savedProduct, ...current],
      );

      setSelected(null);
      setCreateOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to persist product.");
    } finally {
      setIsSaving(false);
    }
  };

  const archive = async (id: string) => {
    try {
      await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Could not archive product via API:", err);
    }
    setRecords((current) => current.filter((p) => p.id !== id));
  };

  return (
    <AdminShell
      title="Product Catalogue"
      description="Manage formulations, pricing, stock levels, and photography assets."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_auto]">
        <input
          placeholder="Search products by title, SKU, or tags..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputClass}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="h-10 border border-[#d9cec5] bg-white/60 px-3 text-xs"
        >
          <option value="all">All categories</option>
          <option value="perfume">Perfumes</option>
          <option value="makeup">Makeup</option>
          <option value="grooming">Grooming</option>
          <option value="bundle">Bundles</option>
          <option value="accessories">Accessories</option>
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          className="h-10 border border-[#d9cec5] bg-white/60 px-3 text-xs"
        >
          <option value="all">All stock</option>
          <option value="low">Low stock (≤ 8)</option>
          <option value="healthy">Healthy stock (&gt; 8)</option>
        </select>
        <Button
          onClick={openCreate}
          className="h-10 rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase tracking-[0.14em]"
        >
          + Add product
        </Button>
      </div>

      <div className="mt-4 flex justify-between text-xs text-[#776a61]">
        <span>Showing {filtered.length} of {records.length} products</span>
        <span>Connected to PostgreSQL catalogue repository</span>
      </div>

      <div className="mt-4">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Gender</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </TableHeader>
          {filtered.map((product) => (
            <tr key={product.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={product.images[0] || "/images/product-perfume.jpg"}
                    alt=""
                    className="h-10 w-10 object-cover bg-blush/20 border border-[#e7ddd5]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <div>
                    <p className="font-medium text-[#211b18]">{product.name}</p>
                    <p className="text-[10px] text-[#8f8279]">{product.sku}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>{product.gender}</TableCell>
              <TableCell>£{product.price}</TableCell>
              <TableCell>{product.stock}</TableCell>
              <TableCell>
                <AdminStatus tone={product.stock <= 5 ? "warning" : "positive"}>
                  {product.stock <= 5 ? "Low Stock" : "Active"}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right space-x-3">
                <button
                  onClick={() => openEdit(product)}
                  className="text-xs text-[#8f5d48] underline hover:text-black"
                >
                  Edit
                </button>
                <button
                  onClick={() => archive(product.id)}
                  className="text-xs text-muted-foreground underline hover:text-rosewood"
                >
                  Archive
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>

      {(createOpen || selected) && (
        <AdminDialog
          title={selected ? `Edit ${selected.name}` : "Create New Product"}
          description="Update details, stock counts, photography, and classifications."
          onClose={() => {
            setSelected(null);
            setCreateOpen(false);
          }}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {error && (
              <p className="border border-[#b86d5a] bg-[#5a3028] p-3 text-xs text-white">
                {error}
              </p>
            )}

            <AdminField label="Product Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Amber Oud Noir Eau de Parfum"
              />
            </AdminField>

            {/* Product Image Upload Section */}
            <div className="border border-[#e7ddd5] bg-white/40 p-4">
              <ProductImageUpload
                images={form.images}
                onChange={(imgs) => setForm({ ...form, images: imgs })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="SKU">
                <input
                  className={inputClass}
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. NVX-AMB-01"
                />
              </AdminField>
              <AdminField label="Stock Quantity">
                <input
                  type="number"
                  className={inputClass}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </AdminField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Price (£ GBP)">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </AdminField>
              <AdminField label="Sale Price (£ GBP - Optional)">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={inputClass}
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  placeholder="Leave empty if not on sale"
                />
              </AdminField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Category">
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                >
                  <option value="perfume">Perfume</option>
                  <option value="makeup">Makeup</option>
                  <option value="grooming">Grooming</option>
                  <option value="bundle">Bundle</option>
                  <option value="accessories">Accessories</option>
                </select>
              </AdminField>
              <AdminField label="Gender">
                <select
                  className={inputClass}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                >
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </AdminField>
            </div>

            <AdminField label="Badge (e.g. BEST SELLER, NEW ARRIVAL)">
              <input
                className={inputClass}
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="Optional tag"
              />
            </AdminField>

            <AdminField label="Search Tags (comma separated)">
              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="luxury, signature, evening, floral"
              />
            </AdminField>

            <AdminField label="Description">
              <textarea
                rows={3}
                className="w-full border border-[#d9cec5] bg-white/60 p-3 text-sm outline-none focus:border-[#8f5d48]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </AdminField>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#d9cec5]">
              <Button
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  setSelected(null);
                  setCreateOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={isSaving}
                onClick={save}
                className="bg-[#211b18] text-white hover:bg-black min-w-[120px]"
              >
                {isSaving ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
