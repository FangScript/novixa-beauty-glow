import { prisma } from "../lib/db/client";

const BASE_URL = "http://localhost:8080";

interface TestReport {
  name: string;
  endpoint: string;
  status: "PASSED" | "FAILED";
  details?: string;
}

const reports: TestReport[] = [];

async function assertTest(
  name: string,
  endpoint: string,
  fn: () => Promise<void>
) {
  try {
    await fn();
    reports.push({ name, endpoint, status: "PASSED" });
    console.log(`✓ [PASSED] ${name} (${endpoint})`);
  } catch (err: any) {
    reports.push({ name, endpoint, status: "FAILED", details: err.message });
    console.error(`✗ [FAILED] ${name} (${endpoint}):`, err.message);
  }
}

async function runAllApiTests() {
  console.log("=================================================");
  console.log("   NOVIXA LUXURY: FULL API QA VERIFICATION SUITE   ");
  console.log("=================================================\n");

  // 1. Categories API
  await assertTest("Fetch all categories", "GET /api/categories", async () => {
    const res = await fetch(`${BASE_URL}/api/categories`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) && !Array.isArray(data.categories)) {
      throw new Error("Categories response is not an array");
    }
  });

  // 2. Products API - list all
  let firstProductSlug = "";
  let firstProductId = "";
  await assertTest("Fetch active products catalogue", "GET /api/products", async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.products;
    if (!list || list.length === 0) throw new Error("No products returned");
    firstProductSlug = list[0].slug;
    firstProductId = list[0].id;
  });

  // 3. Products API - search filter
  await assertTest("Search products by query", "GET /api/products?search=rose", async () => {
    const res = await fetch(`${BASE_URL}/api/products?search=rose`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.products;
    if (!list) throw new Error("Search returned no products field");
  });

  // 4. Products API - detail by slug
  await assertTest("Fetch single product by slug", `GET /api/products/${firstProductSlug || "velvet-rose"}`, async () => {
    const slug = firstProductSlug || "velvet-rose";
    const res = await fetch(`${BASE_URL}/api/products/${slug}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data || (!data.product && !data.id && !data.slug)) {
      throw new Error("Product data missing");
    }
  });

  // 5. Bundles API
  await assertTest("Fetch product bundles", "GET /api/bundles", async () => {
    const res = await fetch(`${BASE_URL}/api/bundles`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data) throw new Error("Bundles response invalid");
  });

  // 6. Coupons Validate API - Valid coupon
  await assertTest("Validate active coupon (GLOW15)", "POST /api/coupons/validate", async () => {
    const res = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "GLOW15", subtotal: 5000 }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.valid) throw new Error(`Expected coupon to be valid: ${data.message || JSON.stringify(data)}`);
  });

  // 7. Coupons Validate API - Invalid coupon rejection
  await assertTest("Reject invalid coupon code", "POST /api/coupons/validate", async () => {
    const res = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "FAKECOUPON999", subtotal: 5000 }),
    });
    const data = await res.json();
    if (res.ok && data.valid) throw new Error("Invalid coupon was incorrectly accepted");
  });

  // 8. Newsletter API
  await assertTest("Subscribe newsletter email", "POST /api/newsletter", async () => {
    const res = await fetch(`${BASE_URL}/api/newsletter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `tester.${Date.now()}@novixa-glow.co.uk` }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Newsletter failed with status ${res.status}`);
    }
  });

  // 9. Contact API
  await assertTest("Submit contact enquiry", "POST /api/contact", async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "QA Client Tester",
        email: "qa.client@example.com",
        subject: "Product query",
        message: "This is an automated test message from the QA verification runner.",
      }),
    });
    if (!res.ok) throw new Error(`Contact API returned status ${res.status}`);
  });

  // 10. Reviews API - Read
  await assertTest("Fetch product reviews", `GET /api/reviews?productId=${firstProductId}`, async () => {
    const res = await fetch(`${BASE_URL}/api/reviews?productId=${firstProductId}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 11. Cart API - Read
  await assertTest("Fetch session cart", "GET /api/cart", async () => {
    const res = await fetch(`${BASE_URL}/api/cart`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 12. Wishlist API - Read
  await assertTest("Fetch session wishlist", "GET /api/wishlist", async () => {
    const res = await fetch(`${BASE_URL}/api/wishlist`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 13. Admin Login API - Valid credentials
  let adminSessionCookie = "";
  await assertTest("Authenticate valid admin credentials", "POST /api/auth/login", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "Novixaretail@gmail.com",
        password: "Spooky5368@",
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Login not ok");
    const rawCookie = res.headers.get("set-cookie");
    if (rawCookie) adminSessionCookie = rawCookie.split(";")[0];
  });

  // 14. Admin Login API - Invalid credentials rejection
  await assertTest("Reject incorrect admin password", "POST /api/auth/login", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "Novixaretail@gmail.com",
        password: "WrongPassword123!",
      }),
    });
    if (res.status !== 401 && res.status !== 400) {
      throw new Error(`Expected 401/400 but got ${res.status}`);
    }
  });

  // 15. Admin Protected API Security - Unauthorized mutation rejected
  await assertTest("Block unauthorized product mutation", "POST /api/products", async () => {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacker Perfume", price: 10 }),
    });
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401/403 but got ${res.status}`);
    }
  });

  console.log("\n=================================================");
  const passed = reports.filter((r) => r.status === "PASSED").length;
  const failed = reports.filter((r) => r.status === "FAILED").length;
  console.log(`TOTAL APIS TESTED: ${reports.length}`);
  console.log(`PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllApiTests()
  .catch((err) => {
    console.error("Fatal test suite runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
