import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";
import {
  products as fallbackProducts,
  searchProducts,
  markProductDeleted,
  type ProductCategory,
} from "@/lib/products/catalogue";

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
  const ids = searchParams.get("ids");
  const idList = ids
    ? ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    if (process.env.DATABASE_URL) {
      const dbProducts = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          ...(idList.length > 0 ? { id: { in: idList } } : {}),
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
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      const published = dbProducts.filter((p) => {
        const desc = (p.description || "").toLowerCase();
        const slug = (p.slug || "").toLowerCase();
        return (
          !desc.includes("testing product") &&
          !desc.includes("test product") &&
          slug !== "odessian-mist" &&
          !slug.startsWith("test-")
        );
      });

      if (published.length > 0) {
        const mapped = published.map((p) => {
          const approvedReviews = (p as any).reviews || [];
          const count = approvedReviews.length;
          const rating =
            count > 0
              ? Number(
                  (
                    approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count
                  ).toFixed(1),
                )
              : Number(p.rating || 0);

          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            price: Number(p.price),
            salePrice:
              p.salePrice !== null && p.salePrice !== undefined ? Number(p.salePrice) : undefined,
            isMeasured: Boolean(p.isMeasured),
            unitOfMeasure: p.unitOfMeasure || "unit",
            gender: p.gender.toLowerCase(),
            category: p.category.toLowerCase(),
            brand: p.brand,
            sku: p.sku,
            stock: p.stock,
            rating,
            reviewCount: count,
            tags: p.tags,
            images:
              p.images.length > 0
                ? p.images.map((img) => img.url)
                : ["/images/product-perfume.jpg"],
          };
        });

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

  if (idList.length > 0) {
    list = list.filter((p) => idList.includes(p.id) || idList.includes(p.slug));
  }

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
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

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

    if (!name || !sku || price === undefined || price === null || price === "" || !category) {
      return NextResponse.json(
        { error: "Product name, SKU, price, and category are required." },
        { status: 400 },
      );
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a valid number (0.00 or greater)." },
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
            price: numPrice,
            salePrice:
              salePrice !== undefined && salePrice !== null && salePrice !== ""
                ? Number(salePrice)
                : null,
            category: normalizedCategory,
            categoryId: catRecord.id,
            gender: normalizedGender,
            brand: brand || "NOVIXA",
            stock: Number(stock) || 0,
            tags: Array.isArray(tags) ? tags : [],
            status: "ACTIVE",
          },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        });

        if (Array.isArray(images)) {
          await prisma.productImage.deleteMany({ where: { productId: existingProduct.id } });
          const finalImages = images.length > 0 ? images : ["/images/product-perfume.jpg"];
          await prisma.productImage.createMany({
            data: finalImages.map((url: string, index: number) => ({
              productId: existingProduct.id,
              url,
              alt: `${name} photo ${index + 1}`,
              sortOrder: index,
            })),
          });

          const refreshed = await prisma.product.findUnique({
            where: { id: existingProduct.id },
            include: { images: { orderBy: { sortOrder: "asc" } } },
          });
          if (refreshed) product = refreshed;
        }
      } else {
        product = await prisma.product.create({
          data: {
            name,
            slug: safeSlug,
            sku: upperSku,
            description: description || "Luxury formulation crafted by NOVIXA.",
            price: numPrice,
            salePrice:
              salePrice !== undefined && salePrice !== null && salePrice !== ""
                ? Number(salePrice)
                : null,
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
        price: numPrice,
        salePrice:
          salePrice !== undefined && salePrice !== null && salePrice !== ""
            ? Number(salePrice)
            : null,
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
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: "Product ID or SKU is required for updates." },
        { status: 400 },
      );
    }

    if (process.env.DATABASE_URL) {
      // Find the product by ID or SKU
      const existing = await prisma.product.findFirst({
        where: {
          OR: [...(id ? [{ id }] : []), ...(sku ? [{ sku: sku.toUpperCase() }] : [])],
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
      if (
        price !== undefined &&
        price !== null &&
        price !== "" &&
        !isNaN(Number(price)) &&
        Number(price) >= 0
      ) {
        updateData.price = Number(price);
      }
      if (salePrice !== undefined) {
        updateData.salePrice =
          salePrice !== null && salePrice !== "" && !isNaN(Number(salePrice))
            ? Number(salePrice)
            : null;
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
            price:
              price !== undefined &&
              price !== null &&
              price !== "" &&
              !isNaN(Number(price)) &&
              Number(price) >= 0
                ? Number(price)
                : 50,
            salePrice:
              salePrice !== null &&
              salePrice !== undefined &&
              salePrice !== "" &&
              !isNaN(Number(salePrice))
                ? Number(salePrice)
                : null,
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
    const admin = await getAuthenticatedAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";

    if (!id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const target = await prisma.product.findFirst({
        where: {
          OR: [{ id }, { slug: id.toLowerCase() }, { sku: id.toUpperCase() }],
        },
      });

      if (target) {
        if (permanent) {
          // Clean up relations to avoid foreign key constraint errors
          await prisma.bundleItem.deleteMany({ where: { productId: target.id } });
          await prisma.cartItem.deleteMany({ where: { productId: target.id } });
          await prisma.wishlistItem.deleteMany({ where: { productId: target.id } });
          await prisma.productImage.deleteMany({ where: { productId: target.id } });
          await prisma.review.deleteMany({ where: { productId: target.id } });
          await prisma.orderItem.updateMany({
            where: { productId: target.id },
            data: { productId: null },
          });

          await prisma.product.delete({
            where: { id: target.id },
          });
        } else {
          await prisma.product.update({
            where: { id: target.id },
            data: { status: "ARCHIVED" },
          });
        }

        markProductDeleted(target.id);
        markProductDeleted(target.slug);

        return NextResponse.json({
          success: true,
          message: permanent
            ? `Product "${target.name}" permanently deleted.`
            : `Product "${target.name}" archived.`,
        });
      }
    }

    markProductDeleted(id);

    return NextResponse.json({
      success: true,
      message: "Product removed from catalogue.",
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete product." },
      { status: 500 },
    );
  }
}
