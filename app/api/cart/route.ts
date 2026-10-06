import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedCustomer } from "@/lib/auth/session";

const GUEST_COOKIE = "novixa_guest_cart";
const COOKIE_TTL = 60 * 60 * 24 * 30; // 30 days

/** Resolve or create a cart for the current request, merging guest cart if user is authenticated. */
async function resolveCart(_clientUserId?: string | null) {
  if (!process.env.DATABASE_URL) return null;

  // Derive authenticated identity strictly from server session
  const authCustomer = await getAuthenticatedCustomer();
  const resolvedUserId = authCustomer?.id || null;
  const cookieStore = await cookies();

  // Authenticated user with confirmed DB row
  if (resolvedUserId) {
    let cart = await prisma.cart.findFirst({
      where: { userId: resolvedUserId },
      include: {
        items: {
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
        },
      },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: resolvedUserId },
        include: {
          items: {
            include: {
              product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
            },
          },
        },
      });
    }

    // Merge guest cart if present
    const guestId = cookieStore.get(GUEST_COOKIE)?.value;
    if (guestId) {
      try {
        const guestCart = await prisma.cart.findFirst({
          where: { sessionId: guestId, userId: null },
          include: { items: true },
        });

        if (guestCart && guestCart.items.length > 0) {
          for (const gItem of guestCart.items) {
            const existingItem = await prisma.cartItem.findUnique({
              where: { cartId_productId: { cartId: cart.id, productId: gItem.productId } },
            });
            if (existingItem) {
              await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                  quantity: Math.round((existingItem.quantity + gItem.quantity) * 100) / 100,
                },
              });
            } else {
              await prisma.cartItem.create({
                data: { cartId: cart.id, productId: gItem.productId, quantity: gItem.quantity },
              });
            }
          }
          await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => null);

          // Refetch fresh merged items
          const refreshedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: {
              items: {
                include: {
                  product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
                },
              },
            },
          });
          if (refreshedCart) cart = refreshedCart;
        }
      } catch (err) {
        console.warn("Notice: Guest cart merge non-critical warning:", err);
      }
    }

    return cart;
  }

  // Guest — use/create session-keyed cart
  let guestId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestId) {
    guestId = randomBytes(16).toString("hex");
  }

  let cart = await prisma.cart.findFirst({
    where: { sessionId: guestId, userId: null },
    include: {
      items: {
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId: guestId },
      include: {
        items: {
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
        },
      },
    });
  }

  return { cart, guestId };
}

function formatCartItem(item: any) {
  const p = item.product;
  const rawQty = Number(item.quantity);
  const cleanQty = isNaN(rawQty) || rawQty <= 0 ? 1 : Math.round(rawQty * 100) / 100;

  return {
    id: item.id,
    productId: p.id,
    quantity: cleanQty,
    product: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      salePrice: p.salePrice !== null && p.salePrice !== undefined ? Number(p.salePrice) : null,
      stock: Number(p.stock),
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

    // Persist guest cookie on the response if guest
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

    const rawQuantity = Number(quantity);
    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ ok: false, error: "productId is required." }, { status: 400 });
    }
    if (isNaN(rawQuantity) || rawQuantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "quantity must be greater than zero." },
        { status: 400 },
      );
    }
    const cleanQuantity = Math.max(0.01, Math.round(rawQuantity * 100) / 100);

    // Validate product + stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, name: true, status: true },
    });
    if (!product || product.status === "ARCHIVED") {
      return NextResponse.json(
        { ok: false, error: "Product not found or unavailable." },
        { status: 404 },
      );
    }

    const result = await resolveCart(userId ?? null);
    if (!result)
      return NextResponse.json({ ok: false, error: "Could not resolve cart." }, { status: 500 });

    const cart = "cart" in result ? result.cart : result;

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const newQuantity = Math.round(((existing?.quantity ?? 0) + cleanQuantity) * 100) / 100;
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
        data: { cartId: cart.id, productId, quantity: cleanQuantity },
      });
    }

    // Refetch cart for response
    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
        },
      },
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
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to add item." },
      { status: 500 },
    );
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
      return NextResponse.json(
        { ok: false, error: "itemId or productId required." },
        { status: 400 },
      );
    }

    const rawQuantity = Number(quantity);
    if (isNaN(rawQuantity) || rawQuantity < 0) {
      return NextResponse.json(
        { ok: false, error: "quantity must be a non-negative number." },
        { status: 400 },
      );
    }
    const cleanQuantity = Math.max(0, Math.round(rawQuantity * 100) / 100);

    const result = await resolveCart(userId ?? null);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Could not resolve cart." }, { status: 400 });
    }
    const cart = "cart" in result ? result.cart : result;

    // Verify ownership: itemId must belong to this specific cart
    if (itemId) {
      const item = await prisma.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id },
      });
      if (!item) {
        return NextResponse.json(
          { ok: false, error: "Item not found in your cart." },
          { status: 404 },
        );
      }
    }

    // quantity === 0 means remove
    if (cleanQuantity === 0) {
      if (itemId) {
        await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
      } else if (productId) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
      }
      return NextResponse.json({ ok: true, removed: true });
    }

    // Validate stock
    let resolvedProductId = productId;
    if (itemId && !productId) {
      const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
      resolvedProductId = item?.productId;
    }

    if (resolvedProductId) {
      const product = await prisma.product.findUnique({
        where: { id: resolvedProductId },
        select: { stock: true, name: true },
      });
      if (product && cleanQuantity > product.stock) {
        return NextResponse.json(
          { ok: false, error: `Only ${product.stock} units of "${product.name}" available.` },
          { status: 409 },
        );
      }
    }

    if (itemId) {
      await prisma.cartItem.updateMany({
        where: { id: itemId, cartId: cart.id },
        data: { quantity: cleanQuantity },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PUT /api/cart error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to update cart." },
      { status: 500 },
    );
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

    const result = await resolveCart(userId ?? null);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Could not resolve cart." }, { status: 400 });
    }
    const cart = "cart" in result ? result.cart : result;

    if (itemId) {
      // Scoped deletion: cannot delete other users' cart items
      const deleted = await prisma.cartItem.deleteMany({
        where: { id: itemId, cartId: cart.id },
      });
      if (deleted.count === 0) {
        return NextResponse.json(
          { ok: false, error: "Item not found in your cart." },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (clear) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Specify itemId or clear=true." },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("DELETE /api/cart error:", error);
    return NextResponse.json(
      { ok: false, error: error.message ?? "Failed to remove item." },
      { status: 500 },
    );
  }
}
