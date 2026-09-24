import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

// ─── GET /api/bundles ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const bundles = await prisma.bundle.findMany({
        where: { status: { not: "ARCHIVED" } },
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json({
        bundles: bundles.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          description: b.description,
          price: b.price,
          originalValue: b.originalValue,
          status: b.status,
          savings: Math.round((1 - b.price / b.originalValue) * 100),
          products: b.items.length,
          items: b.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            name: i.product.name,
            image: i.product.images[0]?.url ?? "/images/product-perfume.jpg",
          })),
        })),
        source: "db",
      });
    }
  } catch (error) {
    console.error("GET /api/bundles error:", error);
  }

  // Fallback — empty when no DB
  return NextResponse.json({ bundles: [], source: "no-db" });
}

// ─── POST /api/bundles ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Admin session required." },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { name, description, price, originalValue, items } = body;

    if (!name || !price || !originalValue) {
      return NextResponse.json(
        { ok: false, error: "name, price and originalValue are required." },
        { status: 400 },
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const bundle = await prisma.bundle.create({
      data: {
        name,
        slug,
        description: description || "",
        price: Number(price),
        originalValue: Number(originalValue),
        status: "ACTIVE",
        items: {
          create: Array.isArray(items)
            ? items.map((i: { productId: string; quantity?: number }) => ({
                productId: i.productId,
                quantity: i.quantity ?? 1,
              }))
            : [],
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ ok: true, bundle });
  } catch (error: any) {
    console.error("POST /api/bundles error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// ─── PUT /api/bundles ─────────────────────────────────────────────────────────
export async function PUT(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Admin session required." },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, name, description, price, originalValue, status, items } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
    }

    const updated = await prisma.bundle.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: Number(price) }),
        ...(originalValue && { originalValue: Number(originalValue) }),
        ...(status && { status }),
        ...(Array.isArray(items) && {
          items: {
            deleteMany: {},
            create: items.map((i: { productId: string; quantity?: number }) => ({
              productId: i.productId,
              quantity: i.quantity ?? 1,
            })),
          },
        }),
      },
      include: { items: true },
    });

    return NextResponse.json({ ok: true, bundle: updated });
  } catch (error: any) {
    console.error("PUT /api/bundles error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// ─── DELETE /api/bundles?id=xxx (archive) ─────────────────────────────────────
export async function DELETE(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Admin session required." },
      { status: 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
    }

    await prisma.bundle.update({ where: { id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/bundles error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
