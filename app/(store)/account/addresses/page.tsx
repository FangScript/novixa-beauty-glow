"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

type Address = {
  id: string;
  label?: string | null;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
};

const EMPTY_FORM = {
  label: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  phone: "",
  isDefault: false,
};

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data.addresses) setAddresses(data.addresses);
    } catch (err) {
      console.warn("Failed to fetch addresses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setStatus(null);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? "",
      fullName: addr.fullName,
      line1: addr.line1,
      line2: addr.line2 ?? "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone ?? "",
      isDefault: addr.isDefault,
    });
    setStatus(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await fetch("/api/addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: "error", message: data.error || "Failed to save address." });
      } else {
        setStatus({ type: "success", message: editingId ? "Address updated." : "Address added." });
        setShowForm(false);
        setEditingId(null);
        fetchAddresses();
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this address from your account?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  };

  const field = (
    label: string,
    key: keyof typeof EMPTY_FORM,
    opts?: { type?: string; required?: boolean; placeholder?: string; pattern?: string },
  ) => (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
      {label}
      {opts?.required && <span className="text-rosewood"> *</span>}
      <input
        type={opts?.type ?? "text"}
        required={opts?.required}
        placeholder={opts?.placeholder ?? ""}
        pattern={opts?.pattern}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-1.5 h-10 w-full border border-border bg-white/40 px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-rosewood transition-colors"
      />
    </label>
  );

  return (
    <PageShell eyebrow="Account" title="Delivery Addresses">
      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {addresses.length > 0
            ? `${addresses.length} saved address${addresses.length > 1 ? "es" : ""}`
            : "No saved addresses yet."}
        </p>
        {!showForm && (
          <Button
            onClick={openAdd}
            className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-[0.12em] gap-2"
          >
            <Plus size={13} /> ADD NEW ADDRESS
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mt-6 border border-border bg-white/50 p-6">
          <h2 className="font-display text-xl mb-5">
            {editingId ? "Edit Address" : "Add New Address"}
          </h2>

          {status && (
            <div
              className={`mb-4 flex items-start gap-2 border px-4 py-3 text-xs ${
                status.type === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-[#c9765d] bg-[#fbf0ec] text-[#8f2d18]"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
              )}
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("Label (e.g. Home, Work)", "label", { placeholder: "Home" })}
              {field("Full Name", "fullName", { required: true, placeholder: "Recipient name" })}
            </div>
            {field("Street Address", "line1", {
              required: true,
              placeholder: "Flat / House / Street",
            })}
            {field("Address Line 2", "line2", { placeholder: "Landmark, Colony (optional)" })}
            <div className="grid gap-4 sm:grid-cols-3">
              {field("City", "city", { required: true })}
              {field("State", "state", { required: true })}
              {field("PIN Code", "postalCode", { required: true, pattern: "[0-9]{5,6}" })}
            </div>
            {field("Phone (for delivery)", "phone", {
              type: "tel",
              placeholder: "+91 XXXXX XXXXX",
            })}

            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4 accent-rosewood"
              />
              Set as default delivery address
            </label>

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-[0.12em] px-6"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Saving…
                  </span>
                ) : editingId ? (
                  "SAVE CHANGES"
                ) : (
                  "ADD ADDRESS"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none text-[10px] tracking-[0.12em]"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setStatus(null);
                }}
              >
                CANCEL
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Address cards */}
      {isLoading ? (
        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin text-rosewood" />
          Loading addresses…
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="mt-8 border border-border bg-white/30 p-10 text-center">
          <MapPin size={28} className="mx-auto text-rosewood/40" />
          <p className="mt-3 font-display text-xl text-foreground">No saved addresses</p>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs mx-auto">
            Save delivery addresses for faster checkout on future orders.
          </p>
          <Button
            onClick={openAdd}
            className="mt-5 rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-[0.12em] gap-2"
          >
            <Plus size={13} /> ADD ADDRESS
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`relative border bg-white/50 p-5 transition-colors ${
                addr.isDefault ? "border-rosewood/50" : "border-border"
              }`}
            >
              {addr.isDefault && (
                <span className="absolute right-4 top-4 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-rosewood">
                  <Star size={10} fill="currentColor" /> Default
                </span>
              )}
              {addr.label && (
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-rosewood mb-2">
                  {addr.label}
                </p>
              )}
              <p className="font-medium text-sm text-foreground">{addr.fullName}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {addr.line1}
                {addr.line2 && `, ${addr.line2}`}
                <br />
                {addr.city}, {addr.state} — {addr.postalCode}
              </p>
              {addr.phone && <p className="mt-1 text-xs text-muted-foreground">{addr.phone}</p>}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => openEdit(addr)}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deletingId === addr.id}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-rosewood transition-colors"
                >
                  {deletingId === addr.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Button
          asChild
          variant="ghost"
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link href="/account" className="inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to account
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
