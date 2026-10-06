import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedCustomer } from "@/lib/auth/session";

// ─── GET /api/wishlist ─────────────────────────────────────────────
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ items: [], source: "no-db" });
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ items: [], source: "unauthenticated" });
  }

  const userId = customer.id;

  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
            },
          },
        },
      },
    });

    const items =
      wishlist?.items.map((wi) => ({
        id: wi.id,
        productId: wi.productId,
        product: {
          id: wi.product.id,
          name: wi.product.name,
          slug: wi.product.slug,
          price: wi.product.price,
          salePrice: wi.product.salePrice,
          stock: wi.product.stock,
          image: wi.product.images?.[0]?.url ?? "/images/product-perfume.jpg",
        },
      })) ?? [];

    return NextResponse.json({ items, source: "db" });
  } catch (error) {
    console.error("GET /api/wishlist error:", error);
    return NextResponse.json({ items: [], source: "error" });
  }
}

// ─── POST /api/wishlist  { productId } ────────────────────────────────
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Sign in required to save items to your wishlist." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "productId is required." },
        { status: 400 },
      );
    }

    const userId = customer.id;

    // Upsert wishlist
    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Upsert wishlist item
    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      create: { wishlistId: wishlist.id, productId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/wishlist error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to add to wishlist." },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/wishlist?productId=xxx ────────────────────────────
export async function DELETE(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true });
  }

  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "productId is required." },
        { status: 400 },
      );
    }

    const userId = customer.id;
    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (wishlist) {
      await prisma.wishlistItem
        .delete({
          where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/wishlist error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to remove from wishlist." },
      { status: 500 },
    );
  }
}
