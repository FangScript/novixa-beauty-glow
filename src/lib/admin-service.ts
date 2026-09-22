import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix ? " " : ""}${letter.toUpperCase()}`);

async function openDb() {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient();
}
async function adminOrThrow() {
  const { getAuthenticatedAdmin } = await import("@/lib/auth.server");
  const admin = await getAuthenticatedAdmin();
  if (!admin) throw new Response("Unauthorized", { status: 401 });
  return admin;
}

export const listAdminOrders = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const orders = await db.order.findMany({
      include: { user: true, payment: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return orders.map((order) => ({
      id: order.orderNumber,
      customer: order.user?.name ?? "Guest customer",
      email: order.user?.email ?? "Guest checkout",
      date: order.createdAt.toISOString(),
      total: `£${order.total.toLocaleString("en-GB")}`,
      status: titleCase(order.status) as "Pending" | "Processing" | "Shipped" | "Delivered",
      payment: order.paymentStatus === "PAID" ? ("Paid" as const) : ("Requires action" as const),
      items: order.items.map((item) => item.productName),
    }));
  } finally {
    await db.$disconnect();
  }
});
export const updateAdminOrderStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" }) =>
    z
      .object({ id: z.string(), status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await adminOrThrow();
    const db = await openDb();
    try {
      const order = await db.order.update({
        where: { orderNumber: data.id },
        data: { status: data.status },
      });
      await db.adminAuditLog.create({
        data: {
          userId: admin.id,
          action: "UPDATE_STATUS",
          resource: "ORDER",
          resourceId: order.id,
          metadata: { status: data.status },
        },
      });
      return { id: order.orderNumber, status: titleCase(order.status) };
    } finally {
      await db.$disconnect();
    }
  });
export const listAdminCustomers = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const users = await db.user.findMany({
      where: { role: "CUSTOMER" },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      orders: user._count.orders,
      joined: user.createdAt.toISOString(),
      status: "Active" as const,
    }));
  } finally {
    await db.$disconnect();
  }
});
export const listAdminInventory = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const records = await db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { stock: "asc" },
    });
    return records.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      stock: product.stock,
      lowStockAt: product.lowStockAt,
    }));
  } finally {
    await db.$disconnect();
  }
});
export const updateAdminInventory = createServerFn({ method: "POST" })
  .validator((data: { id: string; stock: number }) =>
    z.object({ id: z.string(), stock: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await adminOrThrow();
    const db = await openDb();
    try {
      const product = await db.product.update({
        where: { id: data.id },
        data: { stock: data.stock },
      });
      await db.adminAuditLog.create({
        data: {
          userId: admin.id,
          action: "UPDATE_STOCK",
          resource: "PRODUCT",
          resourceId: data.id,
          metadata: { stock: data.stock },
        },
      });
      return { id: product.id, stock: product.stock };
    } finally {
      await db.$disconnect();
    }
  });
export const listAdminCategories = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const categories = await db.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      products: category._count.products,
      status: "Active" as const,
    }));
  } finally {
    await db.$disconnect();
  }
});
export const createAdminCategory = createServerFn({ method: "POST" })
  .validator((data: { name: string }) =>
    z.object({ name: z.string().trim().min(2).max(80) }).parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await adminOrThrow();
    const db = await openDb();
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    try {
      const category = await db.category.create({ data: { name: data.name, slug } });
      await db.adminAuditLog.create({
        data: { userId: admin.id, action: "CREATE", resource: "CATEGORY", resourceId: category.id },
      });
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        products: 0,
        status: "Active" as const,
      };
    } finally {
      await db.$disconnect();
    }
  });
export const listAdminBundles = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const bundles = await db.bundle.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return bundles.map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      products: bundle.items.length,
      price: bundle.price,
      originalValue: bundle.originalValue,
      status: bundle.status,
    }));
  } finally {
    await db.$disconnect();
  }
});
export const listAdminCoupons = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return coupons.map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minimum: coupon.minimumOrder,
      uses: coupon.usageCount,
      usageLimit: coupon.usageLimit,
      expiry: coupon.expiresAt?.toISOString() ?? "Not set",
      active: coupon.active,
    }));
  } finally {
    await db.$disconnect();
  }
});
export const createAdminCoupon = createServerFn({ method: "POST" })
  .validator((data: { code: string; value: number }) =>
    z
      .object({ code: z.string().trim().min(3).max(30), value: z.number().int().min(1).max(100) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await adminOrThrow();
    const db = await openDb();
    try {
      const coupon = await db.coupon.create({
        data: {
          code: data.code.toUpperCase(),
          type: "PERCENTAGE",
          value: data.value,
          active: false,
        },
      });
      await db.adminAuditLog.create({
        data: { userId: admin.id, action: "CREATE", resource: "COUPON", resourceId: coupon.id },
      });
      return {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minimum: coupon.minimumOrder,
        uses: coupon.usageCount,
        usageLimit: coupon.usageLimit,
        expiry: "Not set",
        active: coupon.active,
      };
    } finally {
      await db.$disconnect();
    }
  });
export const toggleAdminCoupon = createServerFn({ method: "POST" })
  .validator((data: { code: string; active: boolean }) =>
    z.object({ code: z.string(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await adminOrThrow();
    const db = await openDb();
    try {
      const coupon = await db.coupon.update({
        where: { code: data.code },
        data: { active: data.active },
      });
      await db.adminAuditLog.create({
        data: {
          userId: admin.id,
          action: data.active ? "ACTIVATE" : "DEACTIVATE",
          resource: "COUPON",
          resourceId: coupon.id,
        },
      });
      return { code: coupon.code, active: coupon.active };
    } finally {
      await db.$disconnect();
    }
  });
export const listAdminReviews = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const reviews = await db.review.findMany({
      include: { product: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return reviews.map((review) => ({
      id: review.id,
      product: review.product.name,
      customer: review.user.name,
      rating: review.rating,
      review: review.body,
      verified: review.verifiedPurchase,
      status: titleCase(review.status) as "Approved" | "Pending" | "Rejected",
    }));
  } finally {
    await db.$disconnect();
  }
});
export const moderateAdminReview = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: "APPROVED" | "REJECTED" }) =>
    z.object({ id: z.string(), status: z.enum(["APPROVED", "REJECTED"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await adminOrThrow();
    const db = await openDb();
    try {
      const review = await db.review.update({
        where: { id: data.id },
        data: { status: data.status },
      });
      await db.adminAuditLog.create({
        data: {
          userId: admin.id,
          action: data.status === "APPROVED" ? "APPROVE" : "REJECT",
          resource: "REVIEW",
          resourceId: data.id,
        },
      });
      return { id: review.id, status: review.status };
    } finally {
      await db.$disconnect();
    }
  });
export const getAdminAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  await adminOrThrow();
  const db = await openDb();
  try {
    const [orders, products, customers, lowStock, revenue] = await Promise.all([
      db.order.count(),
      db.product.count({ where: { status: { not: "ARCHIVED" } } }),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.product.count({ where: { stock: { lte: 8 }, status: "ACTIVE" } }),
      db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "PAID" } }),
    ]);
    return { orders, products, customers, lowStock, revenue: revenue._sum.total ?? 0 };
  } finally {
    await db.$disconnect();
  }
});
export const getAdminSettings = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await adminOrThrow();
  return {
    admin: { id: admin.id, name: admin.name, email: admin.email },
    database: Boolean(process.env["DATABASE_URL"]),
    payments: Boolean(process.env["STRIPE_SECRET_KEY"]),
    email: Boolean(process.env["SMTP_HOST"]),
    media: Boolean(process.env["S3_BUCKET"]),
  };
});
