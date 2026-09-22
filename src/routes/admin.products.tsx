import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AdminDialog,
  AdminField,
  AdminShell,
  AdminStatus,
  AdminTable,
  ProductRow,
  TableCell,
  TableHeader,
} from "@/components/admin";
import {
  products,
  productSchema,
  type Product,
  type ProductCategory,
  type Gender,
} from "@/lib/commerce/catalogue";
import { archiveProduct, listProducts, saveProduct } from "@/lib/product-service";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });
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
  };
}
function AdminProducts() {
  const [records, setRecords] = useState<Product[]>(products);
  const [source, setSource] = useState<"preview" | "database">("preview");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "healthy">("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [error, setError] = useState("");
  const listProductsFn = useServerFn(listProducts);
  const saveProductFn = useServerFn(saveProduct);
  const archiveProductFn = useServerFn(archiveProduct);
  useEffect(() => {
    listProductsFn()
      .then((result) => {
        setRecords(result.products);
        setSource(result.source);
      })
      .catch(() =>
        setError("Products could not be loaded from the service. Showing the preview catalogue."),
      );
  }, [listProductsFn]);
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
    const parsed = productSchema.safeParse({
      id: selected?.id ?? `draft-${Date.now()}`,
      name: form.name.trim(),
      slug: (selected?.slug ?? form.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      description: form.description.trim(),
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      gender: form.gender,
      category: form.category,
      brand: selected?.brand ?? "NOVIXA",
      sku: form.sku.trim().toUpperCase(),
      images: selected?.images ?? products[0]!.images,
      stock: Number(form.stock),
      rating: selected?.rating ?? 0,
      reviewCount: selected?.reviewCount ?? 0,
      badge: form.badge.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the product fields.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveProductFn({ data: parsed.data });
      setRecords((current) =>
        selected
          ? current.map((item) => (item.id === selected.id ? result.product : item))
          : [result.product, ...current],
      );
      setSource(result.source);
      setSelected(null);
      setCreateOpen(false);
      setError("");
    } catch {
      setError("The product could not be saved. Check the database connection and product fields.");
    } finally {
      setSaving(false);
    }
  };
  const archive = async (product: Product) => {
    if (!window.confirm(`Archive ${product.name}?`)) return;
    setSaving(true);
    try {
      const result = await archiveProductFn({ data: { id: product.id } });
      setRecords((current) => current.filter((item) => item.id !== product.id));
      setSource(result.source);
    } catch {
      setError("The product could not be archived.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminShell
      title="Products"
      description="Manage catalogue content, pricing, product attributes, publishing state, and stock readiness."
    >
      <div className="mb-5 flex flex-col gap-3 border-y border-[#d9cec5] py-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, category, or tag"
            className={`${inputClass} max-w-xl`}
            aria-label="Search products"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className={inputClass}
          >
            <option value="all">All categories</option>
            <option value="perfume">Perfume</option>
            <option value="makeup">Makeup</option>
            <option value="grooming">Grooming</option>
            <option value="bundle">Bundle</option>
            <option value="accessories">Accessories</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
            className={inputClass}
          >
            <option value="all">All stock</option>
            <option value="low">Low stock</option>
            <option value="healthy">Healthy stock</option>
          </select>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 shrink-0 rounded-none text-[10px] uppercase tracking-[0.12em]"
        >
          + Add product
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap justify-between gap-2 text-xs text-[#776a61]">
        <span>
          Showing {filtered.length} of {records.length} products
        </span>
        <span>
          {saving
            ? "Saving product…"
            : source === "database"
              ? "Connected to PostgreSQL product service"
              : "Preview product service · DATABASE_URL not configured"}
        </span>
      </div>
      <AdminTable>
        <TableHeader>
          <th className="px-4 py-3">Product</th>
          <th className="px-4 py-3">Category</th>
          <th className="px-4 py-3">Gender</th>
          <th className="px-4 py-3">Price</th>
          <th className="px-4 py-3">Stock</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3" />
        </TableHeader>
        {filtered.map((product) => (
          <tr key={product.id} className="border-b border-[#e7ddd5] last:border-0">
            <TableCell>
              <div className="flex items-center gap-3">
                <img src={product.images[0]} alt="" className="h-10 w-10 object-cover" />
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="mt-1 text-[10px] text-[#8f8279]">{product.sku}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>{product.gender}</TableCell>
            <TableCell>
              £{(product.salePrice ?? product.price).toLocaleString("en-GB")}
            </TableCell>
            <TableCell>{product.stock}</TableCell>
            <TableCell>
              <AdminStatus
                tone={product.stock <= 5 ? "danger" : product.stock <= 8 ? "warning" : "positive"}
              >
                {product.stock <= 5 ? "Low" : product.stock <= 8 ? "Watch" : "Active"}
              </AdminStatus>
            </TableCell>
            <TableCell className="text-right">
              <button onClick={() => openEdit(product)} className="mr-3 text-[#8f5d48] underline">
                Edit
              </button>
              <button onClick={() => archive(product)} className="text-[#a35742] underline">
                Archive
              </button>
            </TableCell>
          </tr>
        ))}
      </AdminTable>
      {createOpen && (
        <AdminDialog
          title="Add product"
          description="Create a catalogue record. It will remain local until the product repository is connected."
          onClose={() => setCreateOpen(false)}
        >
          <ProductForm
            form={form}
            setForm={setForm}
            error={error}
            onSave={save}
            onCancel={() => setCreateOpen(false)}
            saving={saving}
            isNew
          />
        </AdminDialog>
      )}
      {selected && (
        <AdminDialog
          title="Edit product"
          description={`Updating ${selected.name}. Pricing and stock are validated before saving.`}
          onClose={() => setSelected(null)}
        >
          <ProductForm
            form={form}
            setForm={setForm}
            error={error}
            onSave={save}
            onCancel={() => setSelected(null)}
            saving={saving}
          />
        </AdminDialog>
      )}
    </AdminShell>
  );
}
function ProductForm({
  form,
  setForm,
  error,
  onSave,
  onCancel,
  saving,
  isNew = false,
}: {
  form: ProductForm;
  setForm: (form: ProductForm) => void;
  error: string;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  const update = (key: keyof ProductForm, value: string) => setForm({ ...form, [key]: value });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Product name">
          <input
            value={form.name === "__closed__" ? "" : form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="e.g. Velvet Rose Eau de Parfum"
          />
        </AdminField>
        <AdminField label="SKU">
          <input
            value={form.sku}
            onChange={(e) => update("sku", e.target.value)}
            className={inputClass}
            placeholder="NVP-013"
          />
        </AdminField>
      </div>
      <AdminField label="Description">
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="min-h-24 w-full border border-[#d9cec5] bg-white/60 p-3 text-sm outline-none focus:border-[#8f5d48]"
          placeholder="Describe the product clearly for customers."
        />
      </AdminField>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Price">
          <input
            type="number"
            min="1"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            className={inputClass}
          />
        </AdminField>
        <AdminField label="Sale price" hint="Optional">
          <input
            type="number"
            min="1"
            value={form.salePrice}
            onChange={(e) => update("salePrice", e.target.value)}
            className={inputClass}
          />
        </AdminField>
        <AdminField label="Stock">
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => update("stock", e.target.value)}
            className={inputClass}
          />
        </AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Category">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={inputClass}
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
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
            className={inputClass}
          >
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="unisex">Unisex</option>
          </select>
        </AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Badge" hint="Optional">
          <input
            value={form.badge}
            onChange={(e) => update("badge", e.target.value)}
            className={inputClass}
            placeholder="BEST SELLER"
          />
        </AdminField>
        <AdminField label="Tags" hint="Comma-separated">
          <input
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            className={inputClass}
            placeholder="floral, signature, gift"
          />
        </AdminField>
      </div>
      {error && (
        <p className="border border-[#d89d8d] bg-[#f1d2c9] p-3 text-xs text-[#8f3f2d]">{error}</p>
      )}
      <div className="flex justify-end gap-3 border-t border-[#d9cec5] pt-5">
        <Button variant="outline" onClick={onCancel} className="rounded-none text-[10px] uppercase">
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || form.name === "__closed__"}
          className="rounded-none text-[10px] uppercase"
        >
          {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
