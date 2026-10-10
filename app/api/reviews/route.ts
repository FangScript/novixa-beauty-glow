import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

// ─── GET /api/reviews ─────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const admin = searchParams.get("admin") === "true";

  try {
    if (process.env.DATABASE_URL) {
      let targetProductId = productId;

      if (productId) {
        // Resolve slug or id to the database product record
        const found = await prisma.product.findFirst({
          where: {
            OR: [{ id: productId }, { slug: productId }],
          },
          select: { id: true },
        });
        if (found) {
          targetProductId = found.id;
        }
      }

      const where: any = {};
      if (targetProductId) where.productId = targetProductId;

      let isVerifiedAdmin = false;
      if (admin) {
        const authAdmin = await getAuthenticatedAdmin();
        if (authAdmin) isVerifiedAdmin = true;
      }

      if (!isVerifiedAdmin) {
        where.status = "APPROVED";
      }

      const dbReviews = await prisma.review.findMany({
        where,
        include: {
          product: { select: { name: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (dbReviews.length > 0) {
        return NextResponse.json({
          reviews: dbReviews.map((r) => ({
            id: r.id,
            productId: r.productId,
            product: r.product.name,
            productSlug: r.product.slug,
            customer: r.user.name || r.user.email.split("@")[0],
            rating: r.rating,
            title: r.title,
            review: r.body,
            images: r.images || [],
            verified: r.verifiedPurchase,
            status:
              r.status === "APPROVED"
                ? "Approved"
                : r.status === "REJECTED"
                  ? "Rejected"
                  : "Pending",
            createdAt: r.createdAt.toISOString(),
          })),
          source: "database",
        });
      }
    }
  } catch (error) {
    console.warn("Reviews DB query failed, falling back:", error);
  }

  // Clean empty state when no approved reviews exist
  return NextResponse.json({
    reviews: [],
    total: 0,
    averageRating: 0,
    source: "empty",
  });
}

// ─── POST /api/reviews ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      userId,
      rating,
      title,
      body: reviewBody,
      authorName,
      authorEmail,
      images,
    } = body;

    if (!productId || !rating || !reviewBody) {
      return NextResponse.json(
        { error: "Product ID, star rating, and review text are required." },
        { status: 400 },
      );
    }

    const reviewImages = Array.isArray(images)
      ? images
          .filter((img) => typeof img === "string" && img.startsWith("/uploads/reviews/"))
          .slice(0, 4)
      : [];

    const cleanEmail = (authorEmail || "").trim().toLowerCase();
    const cleanName =
      (authorName || "").trim() || (cleanEmail ? cleanEmail.split("@")[0] : "Customer");

    if (process.env.DATABASE_URL) {
      // 1. Resolve product ID (handle slug or id)
      const targetProduct = await prisma.product.findFirst({
        where: {
          OR: [{ id: productId }, { slug: productId }],
        },
        select: { id: true, name: true },
      });

      if (!targetProduct) {
        return NextResponse.json({ error: "Product not found." }, { status: 404 });
      }

      // 2. Resolve User ID
      let finalUserId = userId;
      if (finalUserId) {
        const exists = await prisma.user.findUnique({ where: { id: finalUserId } });
        if (!exists) finalUserId = null;
      }

      if (!finalUserId && cleanEmail) {
        const upsertedUser = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: { ...(cleanName && { name: cleanName }) },
          create: {
            email: cleanEmail,
            name: cleanName,
            role: "CUSTOMER",
          },
        });
        finalUserId = upsertedUser.id;
      }

      if (!finalUserId) {
        return NextResponse.json(
          { error: "Please provide an email address or sign in to submit a review." },
          { status: 400 },
        );
      }

      // 3. Check if user purchased this product
      const hasPurchased = await prisma.order.findFirst({
        where: {
          userId: finalUserId,
          paymentStatus: { in: ["PAID", "AUTHORIZED"] },
          items: { some: { productId: targetProduct.id } },
        },
      });

      // 4. Create or update the review (status PENDING for admin moderation)
      const review = await prisma.review.upsert({
        where: {
          productId_userId: {
            productId: targetProduct.id,
            userId: finalUserId,
          },
        },
        update: {
          rating: Number(rating),
          title: title ? title.trim() : null,
          body: reviewBody.trim(),
          images: reviewImages,
          status: "PENDING",
          verifiedPurchase: Boolean(hasPurchased),
        },
        create: {
          productId: targetProduct.id,
          userId: finalUserId,
          rating: Number(rating),
          title: title ? title.trim() : null,
          body: reviewBody.trim(),
          images: reviewImages,
          status: "PENDING",
          verifiedPurchase: Boolean(hasPurchased),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Thank you! Your review has been submitted for moderation.",
        review,
      });
    }

    // Fallback simulation when no DB
    return NextResponse.json({
      success: true,
      message: "Thank you! Your review has been submitted for moderation.",
      review: {
        id: `rev-${Date.now()}`,
        productId,
        customer: cleanName,
        rating: Number(rating),
        title: title || "",
        review: reviewBody,
        verified: false,
        status: "Pending",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit review." },
      { status: 500 },
    );
  }
}

// ─── PUT /api/reviews ─────────────────────────────────────────────────────────
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
      return NextResponse.json({ error: "id and status are required." }, { status: 400 });
    }

    const prismaStatus =
      status.toUpperCase() === "APPROVED"
        ? "APPROVED"
        : status.toUpperCase() === "REJECTED"
          ? "REJECTED"
          : "PENDING";

    if (process.env.DATABASE_URL) {
      const updated = await prisma.review.update({
        where: { id },
        data: { status: prismaStatus },
      });

      // Recalculate the product's aggregate rating and review count based on all approved reviews
      const agg = await prisma.review.aggregate({
        where: { productId: updated.productId, status: "APPROVED" },
        _avg: { rating: true },
        _count: { id: true },
      });

      await prisma.product.update({
        where: { id: updated.productId },
        data: {
          rating: agg._count.id > 0 ? Number(agg._avg.rating?.toFixed(1) ?? 5.0) : 5.0,
          reviewCount: agg._count.id,
        },
      });

      return NextResponse.json({ success: true, review: updated });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error("PUT /api/reviews error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update review status." },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/reviews ────────────────────────────────────────────────────────
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
    let id = searchParams.get("id");
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const existing = await prisma.review.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Review not found." }, { status: 404 });
      }

      await prisma.review.delete({ where: { id } });

      // Recalculate product aggregate rating
      const agg = await prisma.review.aggregate({
        where: { productId: existing.productId, status: "APPROVED" },
        _avg: { rating: true },
        _count: { id: true },
      });

      await prisma.product.update({
        where: { id: existing.productId },
        data: {
          rating: agg._count.id > 0 ? Number(agg._avg.rating?.toFixed(1) ?? 5.0) : 0,
          reviewCount: agg._count.id,
        },
      });

      return NextResponse.json({ success: true, message: "Review removed." });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/reviews error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete review." },
      { status: 500 },
    );
  }
}
