import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ inquiries: [] });
    }

    const logs = await prisma.adminAuditLog.findMany({
      where: { action: "CUSTOMER_INQUIRY" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const inquiries = logs.map((log) => {
      const meta = (log.metadata as Record<string, any>) || {};
      return {
        id: log.id,
        name: meta.name || log.user?.name || "Customer",
        email: meta.email || log.user?.email || "Unknown",
        phone: meta.phone || log.user?.phone || null,
        subject: meta.subject || "General Concierge Inquiry",
        orderNumber: log.resourceId || meta.orderNumber || null,
        message: meta.message || "",
        status: meta.status || "PENDING",
        submittedAt: meta.submittedAt || log.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, inquiries });
  } catch (error: any) {
    console.error("GET /api/admin/support error:", error);
    return NextResponse.json({ error: "Failed to load support inquiries." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Inquiry ID and new status are required." }, { status: 400 });
    }

    const normalizedStatus = status === "IN_PROGRESS" ? "IN_REVIEW" : status;
    if (!["PENDING", "IN_REVIEW", "RESOLVED"].includes(normalizedStatus)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true, updated: { id, status } });
    }

    const existing = await prisma.adminAuditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inquiry record not found." }, { status: 404 });
    }

    const currentMeta = (existing.metadata as Record<string, any>) || {};
    const updatedMeta = {
      ...currentMeta,
      status,
      resolvedAt: status === "RESOLVED" ? new Date().toISOString() : currentMeta.resolvedAt,
      lastModifiedBy: admin.email,
    };

    const updated = await prisma.adminAuditLog.update({
      where: { id },
      data: {
        metadata: updatedMeta,
      },
    });

    return NextResponse.json({ ok: true, inquiry: { id: updated.id, status } });
  } catch (error: any) {
    console.error("PUT /api/admin/support error:", error);
    return NextResponse.json({ error: "Failed to update inquiry status." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Inquiry ID is required." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await prisma.adminAuditLog.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/support error:", error);
    return NextResponse.json({ error: "Failed to remove inquiry." }, { status: 500 });
  }
}
