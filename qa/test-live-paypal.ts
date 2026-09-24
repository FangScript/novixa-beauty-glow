async function runLivePayPalFlowTest() {
  console.log("==================================================");
  console.log("NOVIXA BEAUTY & GLOW — LIVE END-TO-END PAYPAL TEST");
  console.log("==================================================");

  const baseUrl = "http://localhost:8080";

  try {
    // 1. Get an existing product
    console.log("\n[Step 1] Fetching live product catalogue...");
    const productsRes = await fetch(`${baseUrl}/api/products`);
    const productsData = await productsRes.json();
    const products = productsData.products || [];
    if (!products.length) {
      throw new Error("No products found in database.");
    }
    const product = products[0];
    console.log(`✓ Product chosen: "${product.name}" (ID: ${product.id}, Price: £${product.price})`);

    // 2. Test /api/payments/paypal/create-order
    console.log("\n[Step 2] Testing /api/payments/paypal/create-order...");
    const createOrderRes = await fetch(`${baseUrl}/api/payments/paypal/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        couponCode: "",
        currency: "GBP",
      }),
    });

    const createOrderData = await createOrderRes.json();
    if (!createOrderRes.ok || !createOrderData.id) {
      throw new Error(`Failed to create PayPal order via API: ${JSON.stringify(createOrderData)}`);
    }

    console.log(`✓ PayPal Order ID generated: ${createOrderData.id}`);
    console.log(`✓ Calculated Amount: £${createOrderData.amount} ${createOrderData.currency}`);

    // 3. Test placing the order into Novixa DB with PayPal payment verification
    console.log("\n[Step 3] Submitting order to /api/orders with paymentMethod='PAYPAL'...");
    const orderPayload = {
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        name: "Lady Eleanor Vance",
        email: "eleanor.vance@mayfair-london.co.uk",
        phone: "+44 20 7946 0912",
      },
      address: {
        line1: "14 Berkeley Square",
        city: "London",
        state: "Greater London",
        postalCode: "W1J 6BQ",
        country: "GB",
      },
      paymentMethod: "PAYPAL",
      paymentDetails: {
        paypalOrderId: createOrderData.id,
        payerEmail: "eleanor.vance@mayfair-london.co.uk",
        payerId: "PAYER-QA-TEST-001",
      },
    };

    const placeOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const placeOrderData = await placeOrderRes.json();
    if (!placeOrderRes.ok || !placeOrderData.ok) {
      throw new Error(`Order placement failed: ${JSON.stringify(placeOrderData)}`);
    }

    const order = placeOrderData.order;
    console.log(`✓ Order Created Successfully in Database!`);
    console.log(`  Order Number: ${order.orderNumber}`);
    console.log(`  Order ID: ${order.id}`);
    console.log(`  Total: £${order.total}`);
    console.log(`  Order Status: ${order.status}`);
    console.log(`  Payment Status: ${order.paymentStatus}`);

    // 4. Verify payment record
    const payment = order.payment;
    console.log("\n[Step 4] Checking Payment Ledger Entry...");
    console.log(`  Provider: ${payment?.provider}`);
    console.log(`  Method: ${payment?.method}`);
    console.log(`  Provider Payment ID: ${payment?.providerPaymentId}`);
    console.log(`  Status: ${payment?.status}`);

    if (payment?.provider !== "PAYPAL" || payment?.status !== "PAID") {
      throw new Error(`Payment record does not match expected PAYPAL / PAID status: ${JSON.stringify(payment)}`);
    }

    console.log("\n==================================================");
    console.log("🎉 ALL LIVE PAYPAL API TESTS COMPLETED SUCCESSFULLY!");
    console.log("==================================================");
  } catch (error: any) {
    console.error("\n❌ Live PayPal Flow Test Failed:", error.message || error);
    process.exit(1);
  }
}

runLivePayPalFlowTest();
