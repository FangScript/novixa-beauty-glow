import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";

const GUEST_COOKIE = "novixa_guest_cart";
const COOKIE_TTL = 60 * 60 * 24 * 30; // 30 days

/** Resolve or create a cart for the current request. */
async function resolveCart(userId?: string | null) {
  if (!process.env.DATABASE_URL) return null;

  // Authenticated user — find or create user cart
  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } },
      });
    }
    return cart;
  }

  // Guest — use/create session-keyed cart
  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestId) {
    guestId = randomBytes(16).toString("hex");
  }

  let cart = await prisma.cart.findFirst({
    where: { sessionId: guestId, userId: null },
    include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId: guestId },
      include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } },
    });
  }

  return { cart, guestId };
}

function formatCartItem(item: any) {
  const p = item.product;
  return {
    id: item.id,
    productId: p.id,
    quantity: item.quantity,
    product: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      salePrice: p.salePrice,
      stock: p.stock,
      sku: p.sku,
      image: p.images?.[0]?.url ?? "/images/product-perfume.jpg",
    },
  };
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? null;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ items: [], source: "no-db" });
  }

  try {
    const result = await resolveCart(userId);
    if (!result) return NextResponse.json({ items: [], source: "no-db" });

    const cart = "cart" in result ? result.cart : result;
    const items = cart.items.map(formatCartItem);

    const response = NextResponse.json({ items, cartId: cart.id, source: "db" });

    // Persist guest cookie on the response
    if ("guestId" in result && result.guestId) {
      response.cookies.set(GUEST_COOKIE, result.guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_TTL,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("GET /api/cart error:", error);
    return NextResponse.json({ items: [], source: "error" });
  }
}

// ─── POST /api/cart  { productId, quantity, userId? } ────────────────────────
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { productId, quantity = 1, userId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ ok: false, error: "productId is required." }, { status: 400 });
    }
    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json({ ok: false, error: "quantity must be a positive integer." }, { status: 400 });
    }

    // Validate product + stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, name: true, status: true },
    });
    if (!product || product.status === "ARCHIVED") {
      return NextResponse.json({ ok: false, error: "Product not found or unavailable." }, { status: 404 });
    }

    const result = await resolveCart(userId ?? null);
    if (!result) return NextResponse.json({ ok: false, error: "Could not resolve cart." }, { status: 500 });

    const cart = "cart" in result ? result.cart : result;

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const newQuantity = (existing?.quantity ?? 0) + quantity;
    if (newQuantity > product.stock) {
      return NextResponse.json(
        { ok: false, error: `Only ${product.stock} units of "${product.name}" available.` },
        { status: 409 },
      );
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    // Refetch cart for response
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } } } },
    });

    const items = updated?.items.map(formatCartItem) ?? [];
    const res = NextResponse.json({ ok: true, items, cartId: cart.id });

    if ("guestId" in result && result.guestId) {
      res.cookies.set(GUEST_COOKIE, result.guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_TTL,
        path: "/",
      });
    }

    return res;
  } catch (error: any) {
    console.error("POST /api/cart error:", error);
    return NextResponse.json({ ok: false, error: error.message ?? "Failed to add item." }, { status: 500 });
  }
}

// ─── PUT /api/cart  { itemId, quantity, userId? } ────────────────────────────
export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { itemId, productId, quantity, userId } = body;

    if (!itemId && !productId) {
      return NextResponse.json({ ok: false, error: "itemId or productId required." }, { status: 400 });
    }

    if (typeof quantity !== "number" || quantity < 0) {
      return NextResponse.json({ ok: false, error: "quantity must be a non-negative number." }, { status: 400 });
    }

    // quantity === 0 means remove
    if (quantity === 0) {
      if (itemId) {
        await prisma.cartItem.delete({ where: { id: itemId } }).catch(() => {});
      } else {
        const result = await resolveCart(userId ?? null);
        const cart = result && ("cart" in result ? result.cart : result);
        if (cart && productId) {
          await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
        }
      }
      return NextResponse.json({ ok: true, removed: true });
    }

    // Validate stock
    let resolvedProductId = productId;
    if (itemId && !productId) {
      const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
      resolvedProductId = item?.productId;
    }

    if (resolvedProductId) {
      const product = await prisma.product.findUnique({
        where: { id: resolvedProductId },
        select: { stock: true, name: true },
      });
      if (product && quantity > product.stock) {
        return NextResponse.json(
          { ok: false, error: `Only ${product.stock} units of "${product.name}" available.` },
          { status: 409 },
        );
      }
    }

    if (itemId) {
      await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PUT /api/cart error:", error);
    return NextResponse.json({ ok: false, error: error.message ?? "Failed to update cart." }, { status: 500 });
  }
}

// ─── DELETE /api/cart  ?itemId=xxx or ?userId=xxx&clear=true ─────────────────
export async function DELETE(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const userId = searchParams.get("userId");
    const clear = searchParams.get("clear") === "true";

    if (itemId) {
      await prisma.cartItem.delete({ where: { id: itemId } }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    if (clear) {
      const result = await resolveCart(userId ?? null);
      const cart = result && ("cart" in result ? result.cart : result);
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Specify itemId or clear=true." }, { status: 400 });
  } catch (error: any) {
    console.error("DELETE /api/cart error:", error);
    return NextResponse.json({ ok: false, error: error.message ?? "Failed to remove item." }, { status: 500 });
  }
}
