import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma, VendorOrderStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { paymentProvider } from "@/lib/payments";
import { priceOrder, type PricedLine } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { CartEntry } from "./cart";

export class CheckoutError extends Error {}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

function orderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `MK-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Turns a cart into a pending order: re-prices from the database, reserves stock atomically,
 * snapshots per-shop commission, then opens a hosted checkout with the payment provider.
 */
export async function placeOrder(
  customer: { id: string; email: string },
  cart: CartEntry[],
  address: ShippingAddress,
) {
  if (cart.length === 0) throw new CheckoutError("Your cart is empty");

  const products = await prisma.product.findMany({
    where: { id: { in: cart.map((e) => e.p) }, status: "ACTIVE", shop: { status: "ACTIVE" } },
    include: { shop: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: PricedLine[] = cart.map((entry) => {
    const product = byId.get(entry.p);
    if (!product) throw new CheckoutError("An item in your cart is no longer available");
    if (product.shop.ownerId === customer.id) throw new CheckoutError("You can't buy products from your own shop");
    if (product.currency !== env.currency) throw new CheckoutError(`${product.title} is priced in another currency`);
    return {
      productId: product.id,
      shopId: product.shopId,
      title: product.title,
      imageUrl: product.images[0]?.url ?? null,
      unitCents: product.priceCents,
      quantity: entry.q,
    };
  });

  const terms = Object.fromEntries(
    products.map((p) => [p.shopId, { commissionBps: p.shop.commissionBps ?? env.defaultCommissionBps }]),
  );
  const totals = priceOrder(lines, terms, {
    shippingPerShopCents: env.shippingPerShopCents,
    freeShippingThresholdCents: env.freeShippingThresholdCents,
  });

  // A customer re-entering checkout abandons their earlier unpaid attempts (releasing stock).
  const stale = await prisma.order.findMany({
    where: { customerId: customer.id, status: "PENDING_PAYMENT" },
    select: { id: true },
  });
  for (const { id } of stale) await abandonOrder(id);

  const provider = paymentProvider();
  const number = orderNumber();

  const order = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      // Conditional decrement: fails instead of overselling when two buyers race.
      const reserved = await tx.product.updateMany({
        where: { id: line.productId, stock: { gte: line.quantity }, status: "ACTIVE" },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count === 0) throw new CheckoutError(`Not enough stock for ${line.title}`);
    }

    return tx.order.create({
      data: {
        number,
        customerId: customer.id,
        currency: env.currency,
        subtotalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
        commissionCents: totals.commissionCents,
        shippingName: address.name,
        shippingLine1: address.line1,
        shippingLine2: address.line2 || null,
        shippingCity: address.city,
        shippingPostalCode: address.postalCode,
        shippingCountry: address.country,
        shippingPhone: address.phone || null,
        paymentProvider: provider.name,
        transferGroup: `order_${number}`,
        vendorOrders: {
          create: totals.vendors.map((v) => ({
            shopId: v.shopId,
            subtotalCents: v.subtotalCents,
            shippingCents: v.shippingCents,
            commissionBps: v.commissionBps,
            commissionCents: v.commissionCents,
            payoutCents: v.payoutCents,
            items: {
              create: v.lines.map((l) => ({
                productId: l.productId,
                title: l.title,
                imageUrl: l.imageUrl,
                unitCents: l.unitCents,
                quantity: l.quantity,
                lineCents: l.lineCents,
              })),
            },
          })),
        },
      },
    });
  });

  // Shipping is one line per shop so the customer sees exactly what they pay for.
  const shippingLines = totals.vendors
    .filter((v) => v.shippingCents > 0)
    .map((v) => ({
      name: `Shipping from ${products.find((p) => p.shopId === v.shopId)!.shop.name}`,
      imageUrl: null,
      unitCents: v.shippingCents,
      quantity: 1,
    }));

  try {
    const checkout = await provider.createCheckout({
      orderId: order.id,
      orderNumber: order.number,
      currency: order.currency,
      customerEmail: customer.email,
      transferGroup: order.transferGroup,
      lines: [
        ...lines.map((l) => ({ name: l.title, imageUrl: absoluteUrl(l.imageUrl), unitCents: l.unitCents, quantity: l.quantity })),
        ...shippingLines,
      ],
      successUrl: `${env.appUrl}/checkout/success?order=${order.id}`,
      cancelUrl: `${env.appUrl}/checkout/cancelled?order=${order.id}`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: checkout.paymentRef } });
    return { order, redirectUrl: checkout.redirectUrl };
  } catch (err) {
    await cancelUnpaidOrder(order.id);
    throw err;
  }
}

function absoluteUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith("/") ? `${env.appUrl}${url}` : url;
}

/** Idempotent: safe to call from both webhooks and redirect handlers. */
export async function markOrderPaid(orderId: string) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (updated.count === 0) return false;
  await prisma.vendorOrder.updateMany({
    where: { orderId, status: "PENDING_PAYMENT" },
    data: { status: "PAID", payoutStatus: "PENDING" },
  });
  return true;
}

/** Customer walked away from payment: close the provider checkout, then release stock. */
export async function abandonOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING_PAYMENT") return false;
  if (order.paymentRef) await paymentProvider().cancelCheckout(order.paymentRef);
  return cancelUnpaidOrder(orderId);
}

/** Cancels an order that was never paid and returns reserved stock. Idempotent. */
export async function cancelUnpaidOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) return false;
    await tx.vendorOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
    const items = await tx.orderItem.findMany({ where: { vendorOrder: { orderId } } });
    await restock(tx, items);
    return true;
  });
}

async function restock(tx: Prisma.TransactionClient, items: { productId: string | null; quantity: number }[]) {
  for (const item of items) {
    if (item.productId) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
  }
}

/** Allowed vendor-side fulfilment transitions. */
const TRANSITIONS: Partial<Record<VendorOrderStatus, VendorOrderStatus[]>> = {
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};

export function nextStatuses(status: VendorOrderStatus) {
  return TRANSITIONS[status] ?? [];
}

export async function updateVendorOrderStatus(
  shopId: string,
  vendorOrderId: string,
  next: VendorOrderStatus,
  trackingCode?: string,
) {
  const vo = await prisma.vendorOrder.findFirst({
    where: { id: vendorOrderId, shopId },
    include: { order: true, items: true },
  });
  if (!vo) throw new CheckoutError("Order not found");
  if (!nextStatuses(vo.status).includes(next)) {
    throw new CheckoutError(`Can't move an order from ${vo.status} to ${next}`);
  }

  if (next === "CANCELLED") {
    // Funds haven't been transferred yet (payouts release on shipment), so refund from the platform.
    if (vo.order.paymentRef) {
      await paymentProvider().refund({
        paymentRef: vo.order.paymentRef,
        amountCents: vo.subtotalCents + vo.shippingCents,
        reason: `Vendor cancelled ${vo.id}`,
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.vendorOrder.update({
        where: { id: vo.id },
        data: { status: "CANCELLED", payoutStatus: "NOT_DUE" },
      });
      await restock(tx, vo.items);
    });
  } else {
    await prisma.vendorOrder.update({
      where: { id: vo.id },
      data: {
        status: next,
        ...(next === "SHIPPED" ? { shippedAt: new Date(), trackingCode: trackingCode || vo.trackingCode } : {}),
        ...(next === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
    });
    if (next === "SHIPPED") await releasePayout(vo.id);
  }

  await syncOrderStatus(vo.orderId);
}

/**
 * Transfers the vendor's share (subtotal + shipping − commission) to their connected
 * account. Payouts are released once the vendor ships, protecting buyers from no-shows.
 */
export async function releasePayout(vendorOrderId: string) {
  const vo = await prisma.vendorOrder.findUnique({
    where: { id: vendorOrderId },
    include: { shop: true, order: true },
  });
  if (!vo || !["PENDING", "FAILED"].includes(vo.payoutStatus)) return;
  if (!["SHIPPED", "DELIVERED"].includes(vo.status)) return;
  if (!vo.shop.stripeAccountId || !vo.shop.payoutsEnabled || !vo.order.paymentRef) return; // stays PENDING

  try {
    const { transferId } = await paymentProvider().transfer({
      vendorOrderId: vo.id,
      destinationAccountId: vo.shop.stripeAccountId,
      amountCents: vo.payoutCents,
      currency: vo.order.currency,
      transferGroup: vo.order.transferGroup,
      paymentRef: vo.order.paymentRef,
    });
    await prisma.vendorOrder.update({
      where: { id: vo.id },
      data: { payoutStatus: "TRANSFERRED", transferId },
    });
  } catch (err) {
    console.error(`Payout failed for vendor order ${vo.id}`, err);
    await prisma.vendorOrder.update({ where: { id: vo.id }, data: { payoutStatus: "FAILED" } });
  }
}

/** Retries every payout that is due, e.g. after a vendor finishes payment onboarding. */
export async function retryDuePayouts(shopId?: string) {
  const due = await prisma.vendorOrder.findMany({
    where: {
      payoutStatus: { in: ["PENDING", "FAILED"] },
      status: { in: ["SHIPPED", "DELIVERED"] },
      ...(shopId ? { shopId } : {}),
    },
    select: { id: true },
  });
  for (const { id } of due) await releasePayout(id);
  return due.length;
}

/** Derives the customer-facing order status from its vendor orders. */
async function syncOrderStatus(orderId: string) {
  const vendorOrders = await prisma.vendorOrder.findMany({ where: { orderId }, select: { status: true } });
  const statuses = vendorOrders.map((v) => v.status);
  const open = statuses.filter((s) => s !== "CANCELLED");

  let status: Prisma.OrderUpdateInput["status"];
  if (open.length === 0) status = "CANCELLED";
  else if (open.every((s) => s === "SHIPPED" || s === "DELIVERED")) status = "FULFILLED";
  else if (open.some((s) => s === "SHIPPED" || s === "DELIVERED")) status = "PARTIALLY_FULFILLED";
  else status = "PAID";

  await prisma.order.updateMany({
    where: { id: orderId, status: { notIn: ["PENDING_PAYMENT", "REFUNDED"] } },
    data: { status },
  });
}
