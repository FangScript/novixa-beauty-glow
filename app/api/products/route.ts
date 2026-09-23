import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { products as fallbackProducts, searchProducts, type ProductCategory } from "@/lib/products/catalogue";

const toPrismaCategory = (cat: string) => {
  const c = cat.toUpperCase();
  if (["PERFUME", "MAKEUP", "GROOMING", "BUNDLE", "ACCESSORIES"].includes(c)) {
    return c as "PERFUME" | "MAKEUP" | "GROOMING" | "BUNDLE" | "ACCESSORIES";
  }
  return "PERFUME";
};

const toPrismaGender = (g: string) => {
  const upper = g.toUpperCase();
  if (["MEN", "WOMEN", "UNISEX"].includes(upper)) {
    return upper as "MEN" | "WOMEN" | "UNISEX";
  }
  return "UNISEX";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const gender = searchParams.get("gender");

  try {
    if (process.env.DATABASE_URL) {
      const dbProducts = await prisma.product.findMany({
        where: {
          status: { not: "ARCHIVED" },
          ...(category && category !== "all" ? { category: toPrismaCategory(category) } : {}),
          ...(gender && gender !== "all" ? { gender: toPrismaGender(gender) } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { sku: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (dbProducts.length > 0) {
        const mapped = dbProducts.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice ?? undefined,
          gender: p.gender.toLowerCase(),
          category: p.category.toLowerCase(),
          brand: p.brand,
          sku: p.sku,
          stock: p.stock,
          rating: Number(p.rating),
          reviewCount: p.reviewCount,
          tags: p.tags,
          images: p.images.length > 0 ? p.images.map((img) => img.url) : ["/images/product-perfume.jpg"],
        }));

        return NextResponse.json({
          total: mapped.length,
          products: mapped,
          source: "database",
        });
      }
    }
  } catch (error) {
    console.warn("Falling back to in-memory catalogue query:", error);
  }

  // Fallback to static catalogue
  let list = q ? searchProducts(q) : fallbackProducts;

  if (category && category !== "all") {
    list = list.filter((p) => p.category === category);
  }

  if (gender && gender !== "all") {
    list = list.filter((p) => p.gender === gender);
  }

  return NextResponse.json({
    total: list.length,
    products: list,
    source: "catalogue",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      sku,
      description,
      price,
      salePrice,
      category,
      gender,
      stock,
      images,
      tags,
      brand,
    } = body;

    if (!name || !sku || !price || !category) {
      return NextResponse.json(
        { error: "Product name, SKU, price, and category are required." },
        { status: 400 },
      );
    }

    let safeSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!safeSlug) safeSlug = `product-${Date.now().toString(36)}`;

    const normalizedCategory = toPrismaCategory(category);
    const normalizedGender = toPrismaGender(gender || "unisex");
    const upperSku = sku.trim().toUpperCase();

    if (process.env.DATABASE_URL) {
      // Ensure category exists
      const catRecord = await prisma.category.upsert({
        where: { slug: category.toLowerCase() },
        update: { name: category },
        create: { slug: category.toLowerCase(), name: category },
      });

      // Check if product already exists by SKU
      const existingProduct = await prisma.product.findUnique({
        where: { sku: upperSku },
      });

      // Ensure slug uniqueness across products
      const slugConflict = await prisma.product.findFirst({
        where: {
          slug: safeSlug,
          NOT: existingProduct ? { id: existingProduct.id } : undefined,
        },
      });
      if (slugConflict) {
        safeSlug = `${safeSlug}-${Date.now().toString().slice(-4)}`;
      }

      let product;
      if (existingProduct) {
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name,
            slug: safeSlug,
            description: description || "Luxury formulation crafted by NOVIXA.",
            price: Number(price),
            salePrice: salePrice ? Number(salePrice) : null,
            category: normalizedCategory,
            categoryId: catRecord.id,
            gender: normalizedGender,
            brand: brand || "NOVIXA",
            stock: Number(stock) || 0,
            tags: Array.isArray(tags) ? tags : [],
            status: "ACTIVE",
          },
          include: { images: true },
        });
      } else {
        product = await prisma.product.create({
          data: {
            name,
            slug: safeSlug,
            sku: upperSku,
            description: description || "Luxury formulation crafted by NOVIXA.",
            price: Number(price),
            salePrice: salePrice ? Number(salePrice) : null,
            category: normalizedCategory,
            categoryId: catRecord.id,
            gender: normalizedGender,
            brand: brand || "NOVIXA",
            stock: Number(stock) || 0,
            tags: Array.isArray(tags) ? tags : [],
            status: "ACTIVE",
            images: {
              create: (Array.isArray(images) && images.length > 0
                ? images
                : ["/images/product-perfume.jpg"]
              ).map((url: string, index: number) => ({
                url,
                alt: `${name} photo ${index + 1}`,
                sortOrder: index,
              })),
            },
          },
          include: { images: true },
        });
      }

      return NextResponse.json({
        success: true,
        product: {
          ...product,
          images: product.images.map((img) => img.url),
        },
      });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: `p-${Date.now()}`,
        name,
        slug: safeSlug,
        sku: upperSku,
        description,
        price,
        salePrice,
        category,
        gender,
        stock,
        images: images?.length ? images : ["/images/product-perfume.jpg"],
      },
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create product." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      slug,
      sku,
      description,
      price,
      salePrice,
      category,
      gender,
      stock,
      images,
      tags,
      brand,
    } = body;

    if (!id && !sku) {
      return NextResponse.json({ error: "Product ID or SKU is required for updates." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      // Find the product by ID or SKU
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            ...(id ? [{ id }] : []),
            ...(sku ? [{ sku: sku.toUpperCase() }] : []),
          ],
        },
      });

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined || name !== undefined) {
        let safeSlug = (slug || name)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        if (!safeSlug) safeSlug = `product-${Date.now().toString(36)}`;

        // Verify slug uniqueness
        const slugConflict = await prisma.product.findFirst({
          where: {
            slug: safeSlug,
            NOT: existing ? { id: existing.id } : undefined,
          },
        });
        if (slugConflict) {
          safeSlug = `${safeSlug}-${Date.now().toString().slice(-4)}`;
        }
        updateData.slug = safeSlug;
      }
      if (sku !== undefined) updateData.sku = sku.toUpperCase();
      if (description !== undefined) updateData.description = description;
      if (price !== undefined && price !== null && Number(price) > 0) {
        updateData.price = Number(price);
      }
      if (salePrice !== undefined) {
        updateData.salePrice = salePrice ? Number(salePrice) : null;
      }
      if (gender !== undefined) updateData.gender = toPrismaGender(gender);
      if (brand !== undefined) updateData.brand = brand;
      if (stock !== undefined) updateData.stock = Number(stock);
      if (Array.isArray(tags)) updateData.tags = tags;

      if (category !== undefined) {
        updateData.category = toPrismaCategory(category);
        const catRecord = await prisma.category.upsert({
          where: { slug: category.toLowerCase() },
          update: { name: category },
          create: { slug: category.toLowerCase(), name: category },
        });
        updateData.categoryId = catRecord.id;
      }

      let updatedProduct;
      const targetId = existing?.id || id;

      if (existing) {
        updatedProduct = await prisma.product.update({
          where: { id: targetId },
          data: updateData,
          include: { images: { orderBy: { sortOrder: "asc" } } },
        });
      } else {
        // Fallback upsert create if not in DB
        const catRecord = await prisma.category.upsert({
          where: { slug: (category || "perfume").toLowerCase() },
          update: { name: category || "perfume" },
          create: { slug: (category || "perfume").toLowerCase(), name: category || "perfume" },
        });
        updatedProduct = await prisma.product.create({
          data: {
            id: targetId.startsWith("p-") ? undefined : targetId,
            name: name || "Product",
            slug: updateData.slug || `prod-${Date.now()}`,
            sku: (sku || `SKU-${Date.now()}`).toUpperCase(),
            description: description || "Luxury formulation crafted by NOVIXA.",
            price: Number(price) || 50,
            salePrice: salePrice ? Number(salePrice) : null,
            category: toPrismaCategory(category || "perfume"),
            categoryId: catRecord.id,
            gender: toPrismaGender(gender || "unisex"),
            brand: brand || "NOVIXA",
            stock: Number(stock) || 0,
            tags: Array.isArray(tags) ? tags : [],
            status: "ACTIVE",
          },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        });
      }

      // Update images if provided
      if (Array.isArray(images) && updatedProduct) {
        await prisma.productImage.deleteMany({ where: { productId: updatedProduct.id } });
        if (images.length > 0) {
          await prisma.productImage.createMany({
            data: images.map((url: string, index: number) => ({
              productId: updatedProduct.id,
              url,
              alt: `${name || "Product"} photo ${index + 1}`,
              sortOrder: index,
            })),
          });
        }
      }

      const refreshed = await prisma.product.findUnique({
        where: { id: updatedProduct.id },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });

      return NextResponse.json({
        success: true,
        product: {
          ...refreshed,
          images: refreshed?.images.map((img) => img.url) ?? [],
        },
      });
    }

    return NextResponse.json({ success: true, product: body });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      await prisma.product.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
    }

    return NextResponse.json({ success: true, message: "Product archived." });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive product." },
      { status: 500 },
    );
  }
}

