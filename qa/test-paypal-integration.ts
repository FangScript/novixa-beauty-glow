import { getPayPalAccessToken, createPayPalOrder, getPayPalOrderDetails } from "../lib/payments/paypal";

async function runPayPalTests() {
  console.log("=========================================");
  console.log("NOVIXA BEAUTY & GLOW — PAYPAL QA TEST SUITE");
  console.log("=========================================");

  try {
    // 1. Test OAuth Token Fetch
    console.log("\n[1] Testing PayPal OAuth Token Authentication...");
    const token = await getPayPalAccessToken();
    if (!token || typeof token !== "string" || token.length < 20) {
      throw new Error("Invalid access token received");
    }
    console.log(`✓ Access token retrieved successfully: ${token.slice(0, 10)}... (length: ${token.length})`);

    // 2. Test Order Creation via REST API v2
    console.log("\n[2] Testing PayPal Order Creation via REST API v2...");
    const testAmount = 85.00;
    const testOrderRef = `NVX-QA-${Date.now().toString().slice(-6)}`;
    const createdOrder = await createPayPalOrder({
      amount: testAmount,
      currency: "GBP",
      orderNumber: testOrderRef,
      description: "Novixa Beauty & Glow Luxury QA Test Order",
    });

    console.log(`✓ Order Created with PayPal ID: ${createdOrder.id}`);
    console.log(`  Status: ${createdOrder.status}`);
    console.log(`  Currency & Value: ${createdOrder.purchase_units?.[0]?.amount?.currency_code} ${createdOrder.purchase_units?.[0]?.amount?.value}`);

    // 3. Test Order Details Fetch
    console.log("\n[3] Testing PayPal Order Details Retrieval...");
    const orderDetails = await getPayPalOrderDetails(createdOrder.id);
    console.log(`✓ Order Details Fetched for ID: ${orderDetails.id}`);
    console.log(`  Intent: ${orderDetails.intent}`);
    console.log(`  Current Status: ${orderDetails.status}`);

    console.log("\n=========================================");
    console.log("ALL PAYPAL TESTS PASSED WITH 100% SUCCESS!");
    console.log("=========================================");
  } catch (error: any) {
    console.error("\n❌ PayPal Integration Test Failed:", error.message || error);
    process.exit(1);
  }
}

runPayPalTests();
