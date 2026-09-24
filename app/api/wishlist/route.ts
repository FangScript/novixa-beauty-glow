import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

async function resolvePrismaUserId(userId?: string | null) {
  if (!userId) return null;
  const user = await prisma.user
    .findFirst({
      where: {
        OR: [{ id: userId }, { email: userId }],
      },
      select: { id: true },
    })
    .catch(() => null);
  return user?.id ?? null;
}

// ─── GET /api/wishlist?userId=xxx ─────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUserId = searchParams.get("userId");

  if (!process.env.DATABASE_URL || !rawUserId) {
    return NextResponse.json({ items: [], source: "no-db" });
  }

  const userId = await resolvePrismaUserId(rawUserId);
  if (!userId) {
    return NextResponse.json({ items: [], source: "no-user" });
  }

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

// ─── POST /api/wishlist  { productId, userId } ────────────────────────────────
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { productId, userId: rawUserId } = body;

    if (!productId || !rawUserId) {
      return NextResponse.json(
        { ok: false, error: "productId and userId are required." },
        { status: 400 },
      );
    }

    const userId = await resolvePrismaUserId(rawUserId);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "User account not found." }, { status: 404 });
    }

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

// ─── DELETE /api/wishlist?productId=xxx&userId=xxx ────────────────────────────
export async function DELETE(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const rawUserId = searchParams.get("userId");

    if (!productId || !rawUserId) {
      return NextResponse.json(
        { ok: false, error: "productId and userId are required." },
        { status: 400 },
      );
    }

    const userId = await resolvePrismaUserId(rawUserId);
    if (userId) {
      const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
      if (wishlist) {
        await prisma.wishlistItem
          .delete({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
          })
          .catch(() => {});
      }
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
