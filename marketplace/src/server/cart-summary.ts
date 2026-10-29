import "server-only";
import { env } from "@/lib/env";
import { priceOrder } from "@/lib/pricing";
import { loadCart } from "./cart";

/** Cart grouped by shop with shipping and totals — the same math checkout will charge. */
export async function cartSummary() {
  const { lines, hasProblems } = await loadCart();
  const priceable = lines.filter((l) => !l.problem);
  const totals = priceOrder(
    priceable.map((l) => ({
      productId: l.product.id,
      shopId: l.product.shopId,
      title: l.product.title,
      imageUrl: l.product.images[0]?.url ?? null,
      unitCents: l.product.priceCents,
      quantity: l.quantity,
    })),
    // Commission doesn't affect what the customer pays.
    Object.fromEntries(priceable.map((l) => [l.product.shopId, { commissionBps: 0 }])),
    { shippingPerShopCents: env.shippingPerShopCents, freeShippingThresholdCents: env.freeShippingThresholdCents },
  );

  const shops = new Map<string, { shop: (typeof lines)[number]["product"]["shop"]; lines: typeof lines; shippingCents: number; subtotalCents: number }>();
  for (const line of lines) {
    const entry = shops.get(line.product.shopId) ?? { shop: line.product.shop, lines: [], shippingCents: 0, subtotalCents: 0 };
    entry.lines.push(line);
    shops.set(line.product.shopId, entry);
  }
  for (const v of totals.vendors) {
    const entry = shops.get(v.shopId)!;
    entry.shippingCents = v.shippingCents;
    entry.subtotalCents = v.subtotalCents;
  }

  return { groups: [...shops.values()], totals, hasProblems, isEmpty: lines.length === 0, currency: env.currency };
}
