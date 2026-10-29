import { describe, expect, it } from "vitest";
import { commissionFor, priceOrder, type PricedLine } from "./pricing";

const opts = { shippingPerShopCents: 500, freeShippingThresholdCents: 5000 };

function line(partial: Partial<PricedLine>): PricedLine {
  return {
    productId: "p1",
    shopId: "s1",
    title: "Item",
    imageUrl: null,
    unitCents: 1000,
    quantity: 1,
    ...partial,
  };
}

describe("commissionFor", () => {
  it("rounds half up to the minor unit", () => {
    expect(commissionFor(1005, 1000)).toBe(101); // 100.5 → 101
    expect(commissionFor(999, 1250)).toBe(125); // 124.875 → 125
  });

  it("rejects rates outside 0–100%", () => {
    expect(() => commissionFor(100, -1)).toThrow(RangeError);
    expect(() => commissionFor(100, 10_001)).toThrow(RangeError);
  });
});

describe("priceOrder", () => {
  it("splits a cart per shop with each shop's own commission rate", () => {
    const totals = priceOrder(
      [
        line({ productId: "a", shopId: "s1", unitCents: 2000, quantity: 2 }),
        line({ productId: "b", shopId: "s2", unitCents: 6000, quantity: 1 }),
        line({ productId: "c", shopId: "s1", unitCents: 500, quantity: 1 }),
      ],
      { s1: { commissionBps: 1000 }, s2: { commissionBps: 1500 } },
      opts,
    );

    const s1 = totals.vendors.find((v) => v.shopId === "s1")!;
    const s2 = totals.vendors.find((v) => v.shopId === "s2")!;

    expect(s1.subtotalCents).toBe(4500);
    expect(s1.shippingCents).toBe(500); // below threshold
    expect(s1.commissionCents).toBe(450);
    expect(s1.payoutCents).toBe(4500 + 500 - 450);

    expect(s2.subtotalCents).toBe(6000);
    expect(s2.shippingCents).toBe(0); // free shipping
    expect(s2.commissionCents).toBe(900);
    expect(s2.payoutCents).toBe(5100);

    expect(totals.totalCents).toBe(11000);
    expect(totals.commissionCents).toBe(1350);
    // Money is conserved: customer total = vendor payouts + platform commission.
    expect(totals.vendors.reduce((a, v) => a + v.payoutCents, 0) + totals.commissionCents).toBe(
      totals.totalCents,
    );
  });

  it("rejects invalid quantities and unknown shops", () => {
    expect(() => priceOrder([line({ quantity: 0 })], { s1: { commissionBps: 0 } }, opts)).toThrow();
    expect(() => priceOrder([line({ shopId: "x" })], { s1: { commissionBps: 0 } }, opts)).toThrow();
  });
});
