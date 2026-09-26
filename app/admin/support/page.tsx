"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MessageSquareText,
  Search,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Loader2,
  Package,
} from "lucide-react";
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

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  orderNumber?: string | null;
  message: string;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED";
  submittedAt: string;
};

const initialSampleInquiries: Inquiry[] = [
  {
    id: "inq-1",
    name: "Eleanor Vance",
    email: "eleanor.vance@mayfair.co.uk",
    phone: "+44 20 7946 0912",
    subject: "Fragrance Consultation & Scent Matching",
    orderNumber: null,
    message:
      "Good afternoon. I adore warm amber and velvety rose profiles with good sillage for gala evenings. Between Velvet Rose and Noir Élan, which formulation offers superior evening projection?",
    status: "PENDING",
    submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "inq-2",
    name: "Marcus Sterling",
    email: "m.sterling@kensington.org",
    phone: "+44 7700 900541",
    subject: "Order Status & Shipping Inquiry",
    orderNumber: "NVX-2026-7842",
    message:
      "Hello, I placed an express courier order yesterday morning for the Gentlemen Grooming Ritual set. Could you kindly verify if the parcel has been collected by Royal Mail Special Delivery?",
    status: "IN_REVIEW",
    submittedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "inq-3",
    name: "Lady Sophia Croft",
    email: "sophia@croftmanor.com",
    phone: null,
    subject: "Custom Gifting & Corporate Orders",
    orderNumber: null,
    message:
      "We are hosting a private dinner in Belgravia and wish to curate 18 bespoke fragrance discovery boxes for our guests. Please advise if custom embossed monogramming is available.",
    status: "RESOLVED",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export default function AdminSupportPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialSampleInquiries);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "IN_REVIEW" | "RESOLVED">("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/support");
      const data = await res.json();
      if (data.ok && Array.isArray(data.inquiries)) {
        if (data.inquiries.length > 0) {
          setInquiries(data.inquiries);
        }
      }
    } catch (err: any) {
      console.warn("Failed to load inquiries from API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        inq.name.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        (inq.orderNumber && inq.orderNumber.toLowerCase().includes(q)) ||
        inq.message.toLowerCase().includes(q) ||
        inq.subject.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || inq.status === statusFilter;
      const matchesSubject = subjectFilter === "ALL" || inq.subject === subjectFilter;

      return matchesQuery && matchesStatus && matchesSubject;
    });
  }, [inquiries, searchQuery, statusFilter, subjectFilter]);

  const uniqueSubjects = useMemo(() => {
    const set = new Set(inquiries.map((i) => i.subject));
    return Array.from(set);
  }, [inquiries]);

  const updateStatus = async (id: string, newStatus: Inquiry["status"]) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)),
        );
        if (selectedInquiry && selectedInquiry.id === id) {
          setSelectedInquiry({ ...selectedInquiry, status: newStatus });
        }
        toast.success(`Inquiry marked as ${newStatus.replace("_", " ")}`);
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to communicate with server");
    } finally {
      setIsUpdating(false);
    }
  };

  const removeInquiry = async (id: string) => {
    if (!confirm("Are you sure you wish to archive this inquiry?")) return;
    try {
      await fetch(`/api/admin/support?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setInquiries((prev) => prev.filter((item) => item.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      toast.success("Inquiry archived.");
    } catch (err: any) {
      toast.error("Failed to archive inquiry.");
    }
  };

  const pendingCount = inquiries.filter((i) => i.status === "PENDING").length;
  const inReviewCount = inquiries.filter((i) => i.status === "IN_REVIEW").length;
  const resolvedCount = inquiries.filter((i) => i.status === "RESOLVED").length;

  return (
    <AdminShell
      title="Concierge & Support Inbox"
      description="Manage bespoke inquiries, client consultations, order escalations, and VIP correspondence."
    >
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Inquiries"
          value={String(inquiries.length)}
          detail="Customer communications logged"
          tone="dark"
        />
        <MetricCard
          label="Awaiting Reply"
          value={String(pendingCount)}
          detail="Require concierge review"
        />
        <MetricCard
          label="In Review"
          value={String(inReviewCount)}
          detail="Specialist attending request"
        />
        <MetricCard
          label="Resolved"
          value={String(resolvedCount)}
          detail="Concluded correspondence"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-y border-[#d9cec5] py-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-3 text-[#776a61]" />
          <input
            type="text"
            placeholder="Search by patron, email, order, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full border border-[#d9cec5] bg-white/70 pl-8 pr-3 text-xs outline-none focus:border-[#8f5d48]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex border border-[#d9cec5] bg-white/60 p-0.5 text-xs">
            {(["ALL", "PENDING", "IN_REVIEW", "RESOLVED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                  statusFilter === st ? "bg-[#211b18] text-white" : "text-[#776a61] hover:text-[#211b18]"
                }`}
              >
                {st === "ALL" ? "All" : st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-8 border border-[#d9cec5] bg-white/70 px-2 text-xs text-[#211b18] outline-none focus:border-[#8f5d48]"
          >
            <option value="ALL">All Topics</option>
            {uniqueSubjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchInquiries}
            disabled={isLoading}
            className="h-8 rounded-none border-[#d9cec5] text-[10px] uppercase tracking-wider text-[#776a61]"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin mr-1" : "mr-1"} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="mt-6">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Received</th>
            <th className="px-4 py-3">Patron Details</th>
            <th className="px-4 py-3">Topic / Subject</th>
            <th className="px-4 py-3">Order Ref</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </TableHeader>
          {filteredInquiries.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-xs text-[#776a61]">
                No customer inquiries matching criteria.
              </td>
            </tr>
          ) : (
            filteredInquiries.map((inq) => {
              const formattedDate = new Date(inq.submittedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr
                  key={inq.id}
                  className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02] cursor-pointer"
                  onClick={() => setSelectedInquiry(inq)}
                >
                  <TableCell className="text-[#776a61] whitespace-nowrap text-xs">
                    {formattedDate}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-[#211b18]">{inq.name}</p>
                    <p className="text-[11px] text-[#776a61]">{inq.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-[#211b18]">{inq.subject}</span>
                    <p className="text-[11px] text-[#776a61] line-clamp-1 max-w-xs">{inq.message}</p>
                  </TableCell>
                  <TableCell className="text-[#8f5d48] font-mono text-xs">
                    {inq.orderNumber || "—"}
                  </TableCell>
                  <TableCell>
                    <AdminStatus
                      tone={
                        inq.status === "RESOLVED"
                          ? "positive"
                          : inq.status === "IN_REVIEW"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {inq.status.replace("_", " ")}
                    </AdminStatus>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInquiry(inq);
                      }}
                      className="text-[11px] text-[#8f5d48] hover:underline font-semibold mr-3"
                    >
                      Open
                    </button>
                    <a
                      href={`mailto:${inq.email}?subject=Re: [NOVIXA Concierge] ${encodeURIComponent(
                        inq.subject,
                      )}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-[#211b18] hover:underline mr-3 inline-flex items-center gap-0.5"
                    >
                      Reply <ExternalLink size={10} />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeInquiry(inq.id);
                      }}
                      className="text-[11px] text-[#a04040] hover:underline"
                    >
                      <Trash2 size={12} className="inline" />
                    </button>
                  </TableCell>
                </tr>
              );
            })
          )}
        </AdminTable>
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <AdminDialog
          title={`Inquiry from ${selectedInquiry.name}`}
          description={`Topic: ${selectedInquiry.subject}`}
          onClose={() => setSelectedInquiry(null)}
        >
          <div className="space-y-5 text-xs text-[#211b18]">
            {/* Metadata Summary */}
            <div className="grid grid-cols-2 gap-3 bg-[#faf7f4] border border-[#e8dfd8] p-3.5 rounded-sm">
              <div>
                <p className="text-[10px] uppercase text-[#776a61] tracking-wider">Patron</p>
                <p className="font-semibold text-sm text-[#211b18] mt-0.5">{selectedInquiry.name}</p>
                <p className="text-[#8f5d48]">{selectedInquiry.email}</p>
                {selectedInquiry.phone && (
                  <p className="text-[#776a61] text-[11px] mt-0.5">{selectedInquiry.phone}</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#776a61] tracking-wider">Reference</p>
                <p className="font-mono text-sm font-semibold mt-0.5">
                  {selectedInquiry.orderNumber || "No Order Linked"}
                </p>
                <p className="text-[10px] text-[#776a61] mt-1">
                  Received:{" "}
                  {new Date(selectedInquiry.submittedAt).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#776a61] mb-1.5 font-semibold">
                Client Correspondence:
              </p>
              <div className="border border-[#d9cec5] bg-white p-4 font-serif text-sm leading-relaxed text-[#211b18] whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex items-center justify-between border-t border-[#e8dfd8] pt-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-[#776a61] tracking-wider font-semibold">
                  Update Status:
                </span>
                <select
                  value={selectedInquiry.status}
                  onChange={(e) =>
                    updateStatus(selectedInquiry.id, e.target.value as Inquiry["status"])
                  }
                  disabled={isUpdating}
                  className="h-8 border border-[#d9cec5] bg-white px-2 text-xs font-semibold outline-none focus:border-[#8f5d48]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_REVIEW">IN REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=Re: [NOVIXA Concierge] ${encodeURIComponent(
                    selectedInquiry.subject,
                  )}`}
                  className="inline-flex items-center gap-1.5 bg-[#8f5d48] text-white hover:bg-[#724837] text-[10px] uppercase tracking-wider px-3.5 py-2 font-semibold"
                >
                  <Mail size={12} />
                  Send Email Reply
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInquiry(null)}
                  className="rounded-none text-[10px] uppercase tracking-wider"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
