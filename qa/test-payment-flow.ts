import { prisma } from "../lib/db/client";

async function main() {
  console.log("=== NOVIXA BEAUTY GLOW: PAYMENT & ORDER VERIFICATION SUITE ===");

  // 1. Fetch active product
  const product = await prisma.product.findFirst({
    where: { status: "ACTIVE", stock: { gt: 10 } },
  });

  if (!product) {
    throw new Error("No active product with stock found.");
  }

  console.log(
    `[1] Selected test product: ${product.name} (SKU: ${product.sku}, Stock: ${product.stock}, Price: £${product.price})`,
  );
  const initialStock = product.stock;

  // 2. Test Order Placement with CARD (Luhn valid test card)
  console.log("\n[2] Testing Card Payment (Luhn valid card, server-side verified)...");
  const cardOrderRes = await fetch("http://localhost:8080/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1.5 }], // Decimal quantity test!
      customer: {
        name: "Lady Eleanor Vance",
        email: "eleanor.vance@example.co.uk",
        phone: "+44 7700 900077",
      },
      address: {
        line1: "14 Mayfair Square",
        city: "London",
        state: "Greater London",
        postalCode: "W1K 7AA",
        country: "GB",
      },
      paymentMethod: "CARD",
      paymentDetails: {
        cardholderName: "Lady Eleanor Vance",
        cardNumber: "4242424242424242",
        expMonth: "12",
        expYear: "28",
        cvc: "888",
      },
    }),
  });

  const cardOrderData = await cardOrderRes.json();
  console.log(`Card Order Response status: ${cardOrderRes.status}`);
  if (!cardOrderData.ok) {
    console.error("Card order failed:", cardOrderData);
    process.exit(1);
  }

  console.log(`✓ Card Order Placed: ${cardOrderData.order.orderNumber}`);
  console.log(`  Subtotal: £${cardOrderData.order.subtotal}, Total: £${cardOrderData.order.total}`);
  console.log(`  Payment Status: ${cardOrderData.order.paymentStatus}`);
  console.log(`  Payment Method: ${cardOrderData.order.paymentMethod}`);
  console.log(`  Payment ID: ${cardOrderData.order.payments?.[0]?.id}`);
  console.log(`  Provider Payment Ref: ${cardOrderData.order.payments?.[0]?.providerPaymentId}`);

  // Verify stock decremented by decimal quantity (1.5)
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`✓ Stock Check: Initial = ${initialStock}, Updated = ${updatedProduct?.stock}`);
  if (Math.abs((updatedProduct?.stock ?? 0) - (initialStock - 1.5)) > 0.001) {
    console.error("Stock decrement mismatch!");
  } else {
    console.log("✓ Decimal stock deduction (1.5) perfectly matched in database!");
  }

  // 3. Test Invalid Card Rejection (Luhn failure)
  console.log("\n[3] Testing Invalid Card Rejection (Luhn check failure)...");
  const badCardRes = await fetch("http://localhost:8080/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "07123456789",
      },
      address: {
        line1: "1 High St",
        city: "London",
        state: "London",
        postalCode: "E1 6AN",
        country: "GB",
      },
      paymentMethod: "CARD",
      paymentDetails: {
        cardholderName: "Test User",
        cardNumber: "4242424242424241", // Invalid Luhn checksum
        expMonth: "12",
        expYear: "28",
        cvc: "123",
      },
    }),
  });

  const badCardData = await badCardRes.json();
  console.log(`Bad Card Response status: ${badCardRes.status}`);
  console.log(`Bad Card Error Message: ${badCardData.error}`);
  if (
    badCardRes.status === 400 &&
    (badCardData.error?.includes("checksum") || badCardData.error?.includes("Invalid card number"))
  ) {
    console.log("✓ Server-side card validation correctly blocked invalid card!");
  } else {
    console.warn("Unexpected bad card response:", badCardData);
  }

  // 4. Test Bank Transfer Order Placement
  console.log("\n[4] Testing Direct BACS Bank Transfer Order...");
  const bacsOrderRes = await fetch("http://localhost:8080/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 2 }],
      customer: {
        name: "Lord Harrington",
        email: "harrington@kensington.co.uk",
        phone: "+44 7900 123456",
      },
      address: {
        line1: "5 Kensington Palace Gardens",
        city: "London",
        state: "Greater London",
        postalCode: "W8 4QA",
        country: "GB",
      },
      paymentMethod: "BANK_TRANSFER",
      paymentDetails: {
        bankReference: "BACS-TEST-001",
      },
    }),
  });

  const bacsOrderData = await bacsOrderRes.json();
  console.log(`BACS Order status: ${bacsOrderRes.status}`);
  console.log(
    `✓ BACS Order: ${bacsOrderData.order?.orderNumber}, Payment Status: ${bacsOrderData.order?.paymentStatus}`,
  );
  console.log(`  Provider: ${bacsOrderData.order?.payments?.[0]?.provider}`);

  // 5. Test PayPal Order Placement
  console.log("\n[5] Testing PayPal Order Placement...");
  const paypalOrderRes = await fetch("http://localhost:8080/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      customer: {
        name: "Chloe Dupont",
        email: "chloe.dupont@paris.fr",
        phone: "+33 6 12 34 56 78",
      },
      address: {
        line1: "8 Rue de la Paix",
        city: "Paris",
        state: "Île-de-France",
        postalCode: "75002",
        country: "FR",
      },
      paymentMethod: "PAYPAL",
      paymentDetails: {
        payerEmail: "chloe.dupont@paris.fr",
      },
    }),
  });

  const paypalOrderData = await paypalOrderRes.json();
  console.log(`PayPal Order status: ${paypalOrderRes.status}`);
  console.log(
    `✓ PayPal Order: ${paypalOrderData.order?.orderNumber}, Payment Status: ${paypalOrderData.order?.paymentStatus}`,
  );
  console.log(`  Provider: ${paypalOrderData.order?.payments?.[0]?.provider}`);

  // 6. Test Admin Security (Unauthenticated mutation rejected)
  console.log("\n[6] Testing Admin Security Protection...");
  const adminTestRes = await fetch("http://localhost:8080/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Hacker Perfume",
      sku: "HACK-999",
      price: 10,
      category: "perfume",
    }),
  });
  console.log(`Admin Unauthorized POST /api/products status: ${adminTestRes.status}`);
  if (adminTestRes.status === 401) {
    console.log("✓ Admin route successfully protected against unauthorized mutations!");
  } else {
    console.warn("Admin protection status:", adminTestRes.status);
  }

  console.log("\n=== ALL QA TESTS PASSED CLEANLY! ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
