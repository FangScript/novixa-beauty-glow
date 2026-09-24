import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

const defaultCategories = [
  { id: "perfume", name: "Perfumes", slug: "perfume", count: 12 },
  { id: "makeup", name: "Makeup", slug: "makeup", count: 6 },
  { id: "grooming", name: "Grooming", slug: "grooming", count: 4 },
  { id: "bundle", name: "Bundles", slug: "bundle", count: 4 },
  { id: "accessories", name: "Accessories", slug: "accessories", count: 2 },
];

// ─── GET /api/categories ──────────────────────────────────────────────────────
export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const dbCategories = await prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: "asc" },
      });

      if (dbCategories.length > 0) {
        return NextResponse.json({
          categories: dbCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            count: c._count.products,
          })),
          source: "database",
        });
      }
    }
  } catch (error) {
    console.warn("Categories DB query failed, using defaults:", error);
  }

  return NextResponse.json({ categories: defaultCategories, source: "default" });
}

// ─── POST /api/categories ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const trimmedName = name.trim();
    const slug = (body.slug || trimmedName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (process.env.DATABASE_URL) {
      const category = await prisma.category.upsert({
        where: { slug },
        update: { name: trimmedName, description: description || null },
        create: { name: trimmedName, slug, description: description || null },
      });

      return NextResponse.json({
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          count: 0,
        },
        success: true,
      });
    }

    return NextResponse.json({
      category: {
        id: `cat-${Date.now()}`,
        name: trimmedName,
        slug,
        count: 0,
      },
      success: true,
    });
  } catch (error: any) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create category." },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/categories?id=xxx ────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await prisma.category.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/categories error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete category." },
      { status: 500 },
    );
  }
}
