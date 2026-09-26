import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedCustomer } from "@/lib/auth/session";

// GET /api/addresses — fetch all addresses for the authenticated user
export async function GET() {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: customer.id },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("GET /api/addresses error:", error);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

// POST /api/addresses — create a new address
export async function POST(request: Request) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { label, fullName, line1, line2, city, state, postalCode, country, phone, isDefault } =
      body;

    if (!fullName || !line1 || !city || !state || !postalCode) {
      return NextResponse.json(
        { error: "Full name, address, city, state, and postal code are required." },
        { status: 400 },
      );
    }

    // If this is being set as default, clear existing defaults first
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: customer.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: customer.id,
        label: label || null,
        fullName: fullName.trim(),
        line1: line1.trim(),
        line2: line2?.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country || "GB",
        phone: phone?.trim() || null,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error("POST /api/addresses error:", error);
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}

// PUT /api/addresses — update an existing address
export async function PUT(request: Request) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      label,
      fullName,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Address ID is required." }, { status: 400 });
    }

    // Ensure this address belongs to the current user
    const existing = await prisma.address.findFirst({
      where: { id, userId: customer.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    // If setting as default, clear other defaults first
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: customer.id, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        label: label || null,
        fullName: fullName?.trim(),
        line1: line1?.trim(),
        line2: line2?.trim() || null,
        city: city?.trim(),
        state: state?.trim(),
        postalCode: postalCode?.trim(),
        country: country || "GB",
        phone: phone?.trim() || null,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error("PUT /api/addresses error:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

// DELETE /api/addresses — delete an address by id (?id=...)
export async function DELETE(request: Request) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Address ID is required." }, { status: 400 });
    }

    // Ensure ownership
    const existing = await prisma.address.findFirst({
      where: { id, userId: customer.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/addresses error:", error);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
