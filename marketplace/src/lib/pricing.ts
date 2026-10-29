/**
 * Pure pricing logic: splits a multi-shop cart into per-vendor orders and computes the
 * platform commission and each vendor's payout. All amounts are integer minor units.
 */

export interface PricedLine {
  productId: string;
  shopId: string;
  title: string;
  imageUrl: string | null;
  unitCents: number;
  quantity: number;
}

export interface ShopTerms {
  commissionBps: number;
}

export interface PricingOptions {
  shippingPerShopCents: number;
  freeShippingThresholdCents: number;
}

export interface VendorSplit {
  shopId: string;
  lines: (PricedLine & { lineCents: number })[];
  subtotalCents: number;
  shippingCents: number;
  commissionBps: number;
  commissionCents: number;
  payoutCents: number;
}

export interface OrderTotals {
  vendors: VendorSplit[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  commissionCents: number;
}

/** Commission is charged on goods only (not shipping), rounded half-up to the minor unit. */
export function commissionFor(subtotalCents: number, bps: number) {
  if (bps < 0 || bps > 10_000) throw new RangeError(`Invalid commission rate: ${bps} bps`);
  return Math.round((subtotalCents * bps) / 10_000);
}

export function shippingFor(subtotalCents: number, opts: PricingOptions) {
  return subtotalCents >= opts.freeShippingThresholdCents ? 0 : opts.shippingPerShopCents;
}

export function priceOrder(
  lines: PricedLine[],
  terms: Record<string, ShopTerms>,
  opts: PricingOptions,
): OrderTotals {
  const byShop = new Map<string, VendorSplit>();

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new RangeError(`Invalid quantity for ${line.productId}`);
    }
    const shopTerms = terms[line.shopId];
    if (!shopTerms) throw new Error(`Missing commission terms for shop ${line.shopId}`);

    let split = byShop.get(line.shopId);
    if (!split) {
      split = {
        shopId: line.shopId,
        lines: [],
        subtotalCents: 0,
        shippingCents: 0,
        commissionBps: shopTerms.commissionBps,
        commissionCents: 0,
        payoutCents: 0,
      };
      byShop.set(line.shopId, split);
    }
    const lineCents = line.unitCents * line.quantity;
    split.lines.push({ ...line, lineCents });
    split.subtotalCents += lineCents;
  }

  const vendors = [...byShop.values()].map((split) => {
    const shippingCents = shippingFor(split.subtotalCents, opts);
    const commissionCents = commissionFor(split.subtotalCents, split.commissionBps);
    return {
      ...split,
      shippingCents,
      commissionCents,
      payoutCents: split.subtotalCents + shippingCents - commissionCents,
    };
  });

  const sum = (pick: (v: VendorSplit) => number) => vendors.reduce((acc, v) => acc + pick(v), 0);
  const subtotalCents = sum((v) => v.subtotalCents);
  const shippingCents = sum((v) => v.shippingCents);

  return {
    vendors,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    commissionCents: sum((v) => v.commissionCents),
  };
}
