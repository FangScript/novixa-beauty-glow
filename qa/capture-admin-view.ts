import puppeteer from "puppeteer-core";
import path from "path";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();

  // 1. Go to admin login
  console.log("Navigating to /admin/login...");
  await page.goto("http://localhost:8080/admin/login", { waitUntil: "networkidle2" });

  // 2. Fill login credentials
  await page.type('input[type="email"], input[placeholder*="admin@"]', "Novixaretail@gmail.com");
  await page.type('input[type="password"]', "Spooky5368@");
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  console.log("Logged in, current URL:", page.url());

  // 3. Go to admin orders
  await page.goto("http://localhost:8080/admin/orders", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(process.cwd(), "public/test-artifacts/admin-orders-table.png") });
  console.log("Saved admin-orders-table.png");

  // 4. Click Manage on the first order
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const manage = buttons.find((b) => b.textContent?.includes("Manage"));
    if (manage) manage.click();
  });

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(process.cwd(), "public/test-artifacts/admin-order-modal.png") });
  console.log("Saved admin-order-modal.png");

  await browser.close();
}

run();
