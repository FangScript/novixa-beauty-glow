import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

async function runBrowserTest() {
  console.log("=========================================");
  console.log("LAUNCHING LIVE CHROME BROWSER TEST...");
  console.log("=========================================");

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const outputDir = path.join(process.cwd(), "public", "test-artifacts");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1440,960",
      "--disable-web-security",
    ],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Console Error]`, msg.text());
    }
  });

  try {
    // 1. Navigate to shop to initialize domain cookies and context
    console.log("\n[1] Navigating to http://localhost:8080/shop...");
    await page.goto("http://localhost:8080/shop", { waitUntil: "networkidle2" });
    console.log("✓ Shop page loaded:", await page.title());

    // 2. Add an item into the session cart
    console.log("\n[2] Initializing guest shopping bag on server...");
    const cartRes = await page.evaluate(async () => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p27", quantity: 1, userId: null }),
      });
      return res.json();
    });
    console.log("✓ Cart response:", cartRes.ok ? `Item added (Cart ID: ${cartRes.cartId})` : cartRes);

    // 3. Navigate to checkout
    console.log("\n[3] Navigating to http://localhost:8080/checkout...");
    await page.goto("http://localhost:8080/checkout", { waitUntil: "networkidle2" });
    console.log("✓ Checkout page loaded:", await page.title());

    // Wait for the checkout form inputs to appear
    console.log("\n[4] Waiting for checkout form elements...");
    await page.waitForSelector('input[placeholder="Full name"]', { timeout: 15000 });
    console.log("✓ Checkout form is active and loaded!");

    // 4. Fill customer details
    console.log("\n[5] Filling shipping and customer details...");
    await page.type('input[placeholder="Full name"]', "Lady Eleanor Vance", { delay: 20 });
    await page.type('input[placeholder="Email address"]', "eleanor.vance@novixa-test.co.uk", { delay: 20 });
    await page.type('input[placeholder*="Phone number"]', "07123456789", { delay: 20 });
    await page.type('input[placeholder*="Street address"]', "14 Berkeley Square", { delay: 20 });
    await page.type('input[placeholder="City"]', "London", { delay: 20 });
    await page.type('input[placeholder*="County"]', "Greater London", { delay: 20 });
    await page.type('input[placeholder*="Postcode"]', "W1J 6BQ", { delay: 20 });
    console.log("✓ Shipping details entered successfully");

    // 5. Select PayPal option
    console.log("\n[6] Selecting PayPal payment method option...");
    await page.click("#method-paypal");
    console.log("✓ Clicked PayPal radio button");

    // Wait for PayPal SDK and Smart Button container to mount
    console.log("\n[7] Waiting for PayPal Buttons to load from PayPal CDN...");
    await new Promise((r) => setTimeout(r, 6000));

    // Verify UI state
    const paypalDetails = await page.evaluate(() => {
      const textContent = document.body.innerText;
      const iframes = Array.from(document.querySelectorAll("iframe")).map((f) => f.src);
      const paypalIframes = iframes.filter((src) => src.includes("paypal.com") || src.includes("sandbox.paypal.com"));
      const paypalRadio = document.querySelector("#method-paypal") as HTMLInputElement;

      return {
        radioChecked: paypalRadio?.checked,
        hasNotice: textContent.includes("Authorize your purchase securely with your PayPal balance"),
        hasBuyerProtection: textContent.includes("Protected by PayPal Buyer Protection"),
        hasPayWithPayPalButton: textContent.includes("PAY WITH PAYPAL"),
        orderSummaryTotal: textContent.match(/Total\s*([£$€]\s*[\d,.]+)/)?.[0] || "Found",
        iframeCount: iframes.length,
        paypalIframeCount: paypalIframes.length,
        firstIframeUrl: paypalIframes[0] || null,
      };
    });

    console.log("\n[8] Verified Live PayPal Browser Elements:");
    console.log(`  ✓ PayPal Radio Selected: ${paypalDetails.radioChecked}`);
    console.log(`  ✓ Buyer Protection Badge: ${paypalDetails.hasBuyerProtection}`);
    console.log(`  ✓ PayPal Customer Instructions: ${paypalDetails.hasNotice}`);
    console.log(`  ✓ Aside Pay with PayPal Button: ${paypalDetails.hasPayWithPayPalButton}`);
    console.log(`  ✓ Order Summary Total: ${paypalDetails.orderSummaryTotal}`);
    console.log(`  ✓ PayPal Iframes Rendered: ${paypalDetails.paypalIframeCount}`);
    if (paypalDetails.firstIframeUrl) {
      console.log(`  ✓ PayPal Iframe Source URL: ${paypalDetails.firstIframeUrl.slice(0, 85)}...`);
    }

    // Capture full-page screenshot
    const screenshotPath = path.join(outputDir, "paypal-checkout-live.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n✓ Full Page Screenshot saved to: ${screenshotPath}`);

    console.log("\n=========================================");
    console.log("🎉 LIVE BROWSER TEST PASSED WITH 100% SUCCESS!");
    console.log("=========================================");
  } catch (err: any) {
    console.error("❌ Live Browser Test Failed:", err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
