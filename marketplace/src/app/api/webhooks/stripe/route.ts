import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { stripe } from "@/lib/payments/stripe";
import { prisma } from "@/lib/prisma";
import { paymentProvider } from "@/lib/payments";
import { cancelUnpaidOrder, markOrderPaid, retryDuePayouts } from "@/server/orders";

export async function POST(request: Request) {
  if (!env.stripeWebhookSecret) return new Response("Webhook secret not configured", { status: 500 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, env.stripeWebhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await prisma.webhookEvent.create({ data: { id: event.id, provider: "stripe", type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    await handle(event);
  } catch (err) {
    // Let Stripe retry: forget the event so the retry isn't treated as a duplicate.
    await prisma.webhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error(`Stripe webhook ${event.type} failed`, err);
    return new Response("Handler error", { status: 500 });
  }
  return Response.json({ received: true });
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "paid" && session.client_reference_id) {
        const paid = await markOrderPaid(session.client_reference_id);
        if (!paid) await refundIfCancelled(session.client_reference_id, session.id);
      }
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      if (session.client_reference_id) await cancelUnpaidOrder(session.client_reference_id);
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      const payoutsEnabled = account.capabilities?.transfers === "active" && Boolean(account.payouts_enabled);
      const shop = await prisma.shop.findUnique({ where: { stripeAccountId: account.id } });
      if (shop && shop.payoutsEnabled !== payoutsEnabled) {
        await prisma.shop.update({ where: { id: shop.id }, data: { payoutsEnabled } });
        if (payoutsEnabled) await retryDuePayouts(shop.id);
      }
      break;
    }
  }
}

/** A payment that lands on an order we already cancelled (e.g. raced an abandon) is refunded in full. */
async function refundIfCancelled(orderId: string, paymentRef: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order?.status !== "CANCELLED") return;
  await paymentProvider().refund({ paymentRef, amountCents: order.totalCents, reason: "Payment for cancelled order" });
  await prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
}
