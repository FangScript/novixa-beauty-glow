import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { effectiveShippingPrice, requireUKDestination } from "../lib/commerce/shipping";
import { normalizeQuantity } from "../lib/commerce/quantity";
import { settleProviderOrder } from "../lib/payments/capture-provider";
import { reserveSavedOrder } from "../lib/payments/reserve-order";

describe("storefront shipping and quantity regressions", () => {
  it("uses configured rates below the threshold and free standard delivery at 70", () => {
    const standard = { name: "Normal Delivery", price: 0.2 };
    assert.equal(effectiveShippingPrice(standard, 69.99), 0.2);
    assert.equal(effectiveShippingPrice(standard, 70), 0);
    assert.equal(effectiveShippingPrice(standard, 89.99), 0);
    assert.equal(effectiveShippingPrice({ name: "Express Delivery", price: 0.3 }, 89.99), 0.3);
  });
  it("rejects foreign and unknown destinations rather than silently mapping them to GB", () => {
    for (const country of ["GB", "UK", "United Kingdom"])
      assert.equal(requireUKDestination(country), "GB");
    for (const country of ["US", "Pakistan", "unknown", ""])
      assert.throws(() => requireUKDestination(country), /United Kingdom/);
  });
  it("clamps typed quantities to available stock and retains measured steps", () => {
    assert.equal(normalizeQuantity(9, 1, 5), 5);
    assert.equal(normalizeQuantity(NaN, 1, 5), 1);
    assert.equal(normalizeQuantity(-1, 1, 5), 1);
    assert.equal(normalizeQuantity(0.25, 0.01, 5, 0.01), 0.25);
    assert.equal(normalizeQuantity(3, 1, 0), 0);
  });
});
const approved = {
  status: "APPROVED",
  purchase_units: [{ amount: { currency_code: "GBP", value: "10.00" } }],
};
const captured = {
  status: "COMPLETED",
  purchase_units: [
    {
      payments: {
        captures: [
          { id: "CAPTURE", status: "COMPLETED", amount: { currency_code: "GBP", value: "10.00" } },
        ],
      },
    },
  ],
};
describe("capture waits for durable inventory reservation", () => {
  it("reserves after approval and before charging", async () => {
    const events: string[] = [];
    await settleProviderOrder("ORDER", 1000, {
      getOrder: async () => {
        events.push("approval");
        return approved;
      },
      beforeCapture: async () => {
        events.push("reserve");
      },
      captureOrder: async () => {
        events.push("charge");
        return captured;
      },
      pause: async () => {},
    });
    assert.deepEqual(events, ["approval", "reserve", "charge"]);
  });
  it("never charges when reservation fails", async () => {
    let charged = false;
    await assert.rejects(
      settleProviderOrder("ORDER", 1000, {
        getOrder: async () => approved,
        beforeCapture: async () => {
          throw new Error("Sold out");
        },
        captureOrder: async () => {
          charged = true;
          return captured;
        },
        pause: async () => {},
      }),
      /Sold out/,
    );
    assert.equal(charged, false);
  });
  it("does not reserve an unapproved order or reserve twice during capture recovery", async () => {
    let reserved = 0;
    const provider = {
      getOrder: async () => ({ status: "CREATED" }),
      beforeCapture: async () => {
        reserved++;
      },
      captureOrder: async () => captured,
      pause: async () => {},
    };
    await assert.rejects(settleProviderOrder("ORDER", 1000, provider), /incomplete/);
    await settleProviderOrder("ORDER", 1000, { ...provider, getOrder: async () => captured });
    assert.equal(reserved, 0);
  });
});
function fixture(stock = 4) {
  const state = { paymentStatus: "UNPAID", orderStatus: "UNPAID", stock };
  const order = {
    id: "order",
    payment: { id: "payment" },
    couponId: null,
    items: [{ productId: "p", quantity: 2 }],
  } as any;
  const tx = {
    payment: {
      updateMany: async ({ where, data }: any) => {
        if (state.paymentStatus !== where.status) return { count: 0 };
        state.paymentStatus = data.status;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => ({ id: "payment", status: state.paymentStatus }),
      update: async () => ({}),
    },
    product: {
      updateMany: async ({ where, data }: any) => {
        if (state.stock < where.stock.gte) return { count: 0 };
        state.stock -= data.stock.decrement;
        return { count: 1 };
      },
    },
    order: {
      update: async ({ data }: any) => {
        state.orderStatus = data.paymentStatus;
        return {};
      },
    },
  } as any;
  const reserve = async () => {
    const previous = { ...state };
    try {
      await reserveSavedOrder(tx, order);
    } catch (error) {
      Object.assign(state, previous);
      throw error;
    }
  };
  return { state, reserve };
}
describe("saved order reservation transaction", () => {
  it("decrements inventory once across retries", async () => {
    const { state, reserve } = fixture();
    await reserve();
    await reserve();
    assert.equal(state.stock, 2);
    assert.equal(state.orderStatus, "PROCESSING");
  });
  it("rolls back the payment claim when stock is unavailable", async () => {
    const { state, reserve } = fixture(1);
    await assert.rejects(reserve(), /sold out/);
    assert.equal(state.stock, 1);
    assert.equal(state.paymentStatus, "UNPAID");
  });
  it("rejects cancelled payment attempts without changing inventory", async () => {
    const { state, reserve } = fixture();
    state.paymentStatus = "CANCELLED";
    await assert.rejects(reserve(), /cannot be captured/);
    assert.equal(state.stock, 4);
  });
});
