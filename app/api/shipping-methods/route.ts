import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export const DEFAULT_SHIPPING_METHODS = [
  {
    name: "Normal Delivery",
    timeframe: "3-5 days",
    price: 0.20,
    description: "Standard tracked courier delivery within 3-5 business days.",
    active: true,
    isDefault: true,
    displayOrder: 1,
  },
  {
    name: "Express Delivery",
    timeframe: "1-3 days",
    price: 0.30,
    description: "Priority expedited courier dispatch with 1-3 business days delivery.",
    active: true,
    isDefault: false,
    displayOrder: 2,
  },
];

async function ensureDefaultShippingMethods() {
  if (!process.env.DATABASE_URL) return;

  const count = await prisma.shippingMethod.count();
  if (count === 0) {
    for (const item of DEFAULT_SHIPPING_METHODS) {
      await prisma.shippingMethod.create({ data: item });
    }
  }
}

// GET: Fetch shipping methods (filtered by active for checkout, or all for admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get("admin") === "true";

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        methods: DEFAULT_SHIPPING_METHODS.map((m, idx) => ({
          id: `sm-default-${idx + 1}`,
          ...m,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      });
    }

    await ensureDefaultShippingMethods();

    const methods = await prisma.shippingMethod.findMany({
      where: isAdmin ? {} : { active: true },
      orderBy: [{ displayOrder: "asc" }, { price: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, methods });
  } catch (error: any) {
    console.error("GET /api/shipping-methods error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch shipping methods" },
      { status: 500 },
    );
  }
}

// POST: Create a new shipping method
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, timeframe, price, description, active = true, isDefault = false, displayOrder = 0 } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Delivery method name is required." }, { status: 400 });
    }

    if (!timeframe || typeof timeframe !== "string" || !timeframe.trim()) {
      return NextResponse.json({ error: "Delivery timeframe is required (e.g. 3-5 days)." }, { status: 400 });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ error: "Valid non-negative price is required (e.g. 0.20)." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        method: {
          id: `sm-${Date.now()}`,
          name: name.trim(),
          timeframe: timeframe.trim(),
          price: Math.round(numericPrice * 100) / 100,
          description: description?.trim() || null,
          active: Boolean(active),
          isDefault: Boolean(isDefault),
          displayOrder: Number(displayOrder) || 0,
        },
      });
    }

    // If marked as default, clear previous defaults
    if (isDefault) {
      await prisma.shippingMethod.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.shippingMethod.create({
      data: {
        name: name.trim(),
        timeframe: timeframe.trim(),
        price: Math.round(numericPrice * 100) / 100,
        description: description?.trim() || null,
        active: Boolean(active),
        isDefault: Boolean(isDefault),
        displayOrder: Number(displayOrder) || 0,
      },
    });

    return NextResponse.json({ success: true, method: created });
  } catch (error: any) {
    console.error("POST /api/shipping-methods error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create shipping method" },
      { status: 500 },
    );
  }
}

// PUT: Update an existing shipping method
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, timeframe, price, description, active, isDefault, displayOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "Shipping method ID is required." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        method: { ...body },
      });
    }

    const existing = await prisma.shippingMethod.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Shipping method not found." }, { status: 404 });
    }

    // If setting as default, clear any other default first
    if (isDefault === true) {
      await prisma.shippingMethod.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (timeframe !== undefined) dataToUpdate.timeframe = String(timeframe).trim();
    if (price !== undefined) {
      const num = Number(price);
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: "Invalid price value." }, { status: 400 });
      }
      dataToUpdate.price = Math.round(num * 100) / 100;
    }
    if (description !== undefined) dataToUpdate.description = description ? String(description).trim() : null;
    if (active !== undefined) dataToUpdate.active = Boolean(active);
    if (isDefault !== undefined) dataToUpdate.isDefault = Boolean(isDefault);
    if (displayOrder !== undefined) dataToUpdate.displayOrder = Number(displayOrder) || 0;

    const updated = await prisma.shippingMethod.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, method: updated });
  } catch (error: any) {
    console.error("PUT /api/shipping-methods error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update shipping method" },
      { status: 500 },
    );
  }
}

// DELETE: Remove or soft-delete a shipping method
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Shipping method ID is required." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true });
    }

    // Check if any orders reference this shipping method
    const linkedOrdersCount = await prisma.order.count({
      where: { shippingMethodId: id },
    });

    if (linkedOrdersCount > 0) {
      // Soft-delete / deactivate so historical orders are not broken
      await prisma.shippingMethod.update({
        where: { id },
        data: { active: false, isDefault: false },
      });
      return NextResponse.json({
        success: true,
        message: "Shipping method deactivated as historical orders reference it.",
        softDeleted: true,
      });
    }

    await prisma.shippingMethod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Shipping method deleted successfully." });
  } catch (error: any) {
    console.error("DELETE /api/shipping-methods error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete shipping method" },
      { status: 500 },
    );
  }
}
