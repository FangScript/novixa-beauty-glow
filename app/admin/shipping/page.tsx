"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Power, Truck, CheckCircle2, Clock } from "lucide-react";
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

export type ShippingMethod = {
  id: string;
  name: string;
  timeframe: string;
  price: number;
  description: string | null;
  active: boolean;
  isDefault: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminShippingPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    timeframe: "",
    price: "",
    description: "",
    displayOrder: "1",
    isDefault: false,
    active: true,
  });

  const loadShippingMethods = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shipping-methods?admin=true");
      const data = await res.json();
      if (data.success && Array.isArray(data.methods)) {
        setMethods(data.methods);
      }
    } catch (err) {
      console.warn("Failed to load shipping methods:", err);
      toast.error("Could not load delivery charges from server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShippingMethods();
  }, []);

  const openCreateDialog = () => {
    setEditingMethod(null);
    setForm({
      name: "",
      timeframe: "",
      price: "",
      description: "",
      displayOrder: String(methods.length + 1),
      isDefault: methods.length === 0,
      active: true,
    });
    setOpenModal(true);
  };

  const openEditDialog = (item: ShippingMethod) => {
    setEditingMethod(item);
    setForm({
      name: item.name,
      timeframe: item.timeframe,
      price: String(item.price),
      description: item.description || "",
      displayOrder: String(item.displayOrder || 1),
      isDefault: item.isDefault,
      active: item.active,
    });
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.timeframe.trim() || form.price === "") {
      toast.error("Please fill in method name, timeframe, and price.");
      return;
    }

    const numericPrice = parseFloat(form.price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Please enter a valid delivery charge (e.g. 0.20).");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      timeframe: form.timeframe.trim(),
      price: numericPrice,
      description: form.description.trim() || null,
      displayOrder: parseInt(form.displayOrder) || 1,
      isDefault: form.isDefault,
      active: form.active,
    };

    try {
      if (editingMethod) {
        // Update
        const res = await fetch("/api/shipping-methods", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingMethod.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update delivery option.");
        }
        toast.success(`Updated "${payload.name}" successfully.`);
      } else {
        // Create
        const res = await fetch("/api/shipping-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to create delivery option.");
        }
        toast.success(`Created "${payload.name}" successfully.`);
      }

      setOpenModal(false);
      await loadShippingMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery option.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: ShippingMethod) => {
    try {
      const nextActive = !item.active;
      const res = await fetch("/api/shipping-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to toggle status.");
      }
      setMethods((curr) =>
        curr.map((m) => (m.id === item.id ? { ...m, active: nextActive } : m)),
      );
      toast.success(
        `"${item.name}" is now ${nextActive ? "active" : "inactive"}.`,
      );
    } catch (err: any) {
      toast.error(err.message || "Could not change status.");
    }
  };

  const handleSetDefault = async (item: ShippingMethod) => {
    try {
      const res = await fetch("/api/shipping-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isDefault: true, active: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to set default.");
      }
      setMethods((curr) =>
        curr.map((m) => ({ ...m, isDefault: m.id === item.id })),
      );
      toast.success(`"${item.name}" set as the default delivery method.`);
    } catch (err: any) {
      toast.error(err.message || "Could not set default.");
    }
  };

  const handleDelete = async (item: ShippingMethod) => {
    if (
      !confirm(
        `Are you sure you want to remove "${item.name}"? If existing orders reference it, it will be safely deactivated.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/shipping-methods?id=${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete.");
      }
      toast.success(data.message || `Removed "${item.name}".`);
      await loadShippingMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete delivery option.");
    }
  };

  const formatPrice = (val: number) => {
    return `£${val.toFixed(2)}`;
  };

  const activeCount = methods.filter((m) => m.active).length;
  const defaultMethod = methods.find((m) => m.isDefault);
  const lowestCharge = methods.length
    ? Math.min(...methods.map((m) => m.price))
    : 0;

  return (
    <AdminShell
      title="Delivery & Shipping"
      description="Configure checkout delivery methods, timeframes, and customer shipping charges."
    >
      {/* Top Metrics Banner */}
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard
          label="Delivery Options"
          value={String(methods.length)}
          detail="Configured shipping methods"
        />
        <MetricCard
          label="Active Methods"
          value={String(activeCount)}
          detail="Visible at customer checkout"
          tone={activeCount > 0 ? "light" : "dark"}
        />
        <MetricCard
          label="Default Method"
          value={defaultMethod?.name || "None"}
          detail={defaultMethod ? `${defaultMethod.timeframe} · ${formatPrice(defaultMethod.price)}` : "Select a default"}
        />
        <MetricCard
          label="Base Delivery Charge"
          value={formatPrice(lowestCharge)}
          detail="Starting patron shipping rate"
        />
      </div>

      {/* Main Table Card */}
      <div className="mt-8 border border-[#d9cec5] bg-white/70 shadow-xs">
        <div className="flex flex-col gap-4 border-b border-[#e7ddd5] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-xl text-[#211b18]">
              Shipping Rates & Delivery Timeframes
            </h3>
            <p className="mt-1 text-xs text-[#776a61]">
              Manage the shipping methods shown to patrons at checkout. Charges are calculated dynamically.
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="rounded-none bg-[#211b18] text-white hover:bg-black text-xs font-semibold tracking-wider uppercase px-4 self-start sm:self-auto"
          >
            <Plus size={14} className="mr-1.5" />
            Add Delivery Option
          </Button>
        </div>

        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Delivery Method</th>
            <th className="px-4 py-3">Estimated Timeframe</th>
            <th className="px-4 py-3">Delivery Charge</th>
            <th className="px-4 py-3">Display Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </TableHeader>
          {methods.length === 0 && !isLoading ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-xs text-[#776a61]">
                No delivery methods found. Click &quot;Add Delivery Option&quot; to create one.
              </td>
            </tr>
          ) : (
            methods.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.015] transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#8f5d48] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#211b18]">{item.name}</span>
                        {item.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#c9a982]/20 px-2 py-0.5 text-[9px] font-semibold text-[#8f5d48] uppercase tracking-wider">
                            <CheckCircle2 size={10} /> Default
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#776a61] mt-0.5 max-w-sm line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-[#52443c]">
                    <Clock size={12} className="text-muted-foreground" />
                    {item.timeframe}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-sm text-[#211b18]">
                    {formatPrice(item.price)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-[#776a61]">#{item.displayOrder}</span>
                </TableCell>
                <TableCell>
                  <AdminStatus tone={item.active ? "positive" : "warning"}>
                    {item.active ? "Active" : "Inactive"}
                  </AdminStatus>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 text-xs">
                    {!item.isDefault && item.active && (
                      <button
                        onClick={() => handleSetDefault(item)}
                        className="text-[11px] text-[#8f5d48] hover:text-black underline font-medium"
                        title="Set as default method for checkout"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`p-1.5 hover:text-black ${
                        item.active ? "text-[#4b6742]" : "text-[#776a61]"
                      }`}
                      title={item.active ? "Deactivate method" : "Activate method"}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => openEditDialog(item)}
                      className="p-1.5 text-[#52443c] hover:text-black"
                      title="Edit method"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-[#8f2d18] hover:text-red-700"
                      title="Delete method"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TableCell>
              </tr>
            ))
          )}
        </AdminTable>
      </div>

      {/* Create / Edit Modal Dialog */}
      {openModal && (
        <AdminDialog
          onClose={() => setOpenModal(false)}
          title={editingMethod ? "Edit Delivery Option" : "Add Delivery Option"}
          description="Configure shipping option name, estimated timeframe, and cost charged to patrons."
        >
        <div className="space-y-4 text-xs">
          <AdminField label="Delivery Option Name *">
            <input
              type="text"
              required
              placeholder="e.g. Normal Delivery or Express Delivery"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-[#d9cec5] bg-white px-3 py-2 text-xs outline-none focus:border-[#8f5d48]"
            />
          </AdminField>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Estimated Timeframe *">
              <input
                type="text"
                required
                placeholder="e.g. 3-5 days or 1-3 days"
                value={form.timeframe}
                onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                className="w-full border border-[#d9cec5] bg-white px-3 py-2 text-xs outline-none focus:border-[#8f5d48]"
              />
            </AdminField>

            <AdminField label="Delivery Charge (£) *">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g. 0.20 or 0.30"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-[#d9cec5] bg-white px-3 py-2 text-xs outline-none focus:border-[#8f5d48]"
              />
            </AdminField>
          </div>

          <AdminField label="Customer Description (Optional)">
            <textarea
              rows={2}
              placeholder="e.g. Priority dispatch with Royal Mail Special Tracked courier."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-[#d9cec5] bg-white p-3 text-xs outline-none focus:border-[#8f5d48]"
            />
          </AdminField>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Display Priority / Order">
              <input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                className="w-full border border-[#d9cec5] bg-white px-3 py-2 text-xs outline-none focus:border-[#8f5d48]"
              />
            </AdminField>

            <div className="flex flex-col justify-end space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#211b18]">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-[#d9cec5]"
                />
                <span>Set as default selection</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#211b18]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-[#d9cec5]"
                />
                <span>Active (visible in checkout)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e7ddd5]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenModal(false)}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-none bg-[#211b18] text-white hover:bg-black text-xs font-semibold"
            >
              {isSaving ? "Saving…" : editingMethod ? "Save Changes" : "Create Option"}
            </Button>
          </div>
        </div>
      </AdminDialog>
      )}
    </AdminShell>
  );
}
