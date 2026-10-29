import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";

let client: Stripe | null = null;

export function stripe() {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  client ??= new Stripe(env.stripeSecretKey, { appInfo: { name: "Marketplace" } });
  return client;
}

/**
 * Stripe Connect using "separate charges and transfers": the platform charges the customer
 * once for a multi-shop cart, then transfers each vendor's share to their Express account.
 */
export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckout(req) {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: req.customerEmail,
      client_reference_id: req.orderId,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      // Release reserved stock reasonably fast if the customer abandons checkout.
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      line_items: req.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: req.currency,
          unit_amount: line.unitCents,
          product_data: {
            name: line.name,
            ...(line.imageUrl?.startsWith("https://") ? { images: [line.imageUrl] } : {}),
          },
        },
      })),
      payment_intent_data: {
        transfer_group: req.transferGroup,
        metadata: { orderId: req.orderId, orderNumber: req.orderNumber },
      },
      metadata: { orderId: req.orderId },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { redirectUrl: session.url, paymentRef: session.id };
  },

  async isCheckoutPaid(paymentRef) {
    const session = await stripe().checkout.sessions.retrieve(paymentRef);
    return session.payment_status === "paid";
  },

  async cancelCheckout(paymentRef) {
    const session = await stripe().checkout.sessions.retrieve(paymentRef);
    if (session.status === "open") await stripe().checkout.sessions.expire(paymentRef);
  },

  async transfer(req) {
    // paymentRef is the Checkout Session id; resolve the underlying charge so the transfer
    // can be linked with source_transaction (works before the charge's funds are available).
    const session = await stripe().checkout.sessions.retrieve(req.paymentRef, {
      expand: ["payment_intent"],
    });
    const intent = session.payment_intent as Stripe.PaymentIntent | null;
    const chargeId = typeof intent?.latest_charge === "string" ? intent.latest_charge : intent?.latest_charge?.id;

    const transfer = await stripe().transfers.create(
      {
        amount: req.amountCents,
        currency: req.currency,
        destination: req.destinationAccountId,
        transfer_group: req.transferGroup,
        ...(chargeId ? { source_transaction: chargeId } : {}),
        metadata: { vendorOrderId: req.vendorOrderId },
      },
      { idempotencyKey: `transfer-${req.vendorOrderId}` },
    );
    return { transferId: transfer.id };
  },

  async refund(req) {
    const session = await stripe().checkout.sessions.retrieve(req.paymentRef);
    const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntent) throw new Error("Order has no captured payment to refund");
    const refund = await stripe().refunds.create({
      payment_intent: paymentIntent,
      amount: req.amountCents,
      metadata: { reason: req.reason },
    });
    return { refundId: refund.id };
  },

  async onboardingLink(shop) {
    let accountId = shop.stripeAccountId;
    if (!accountId) {
      const account = await stripe().accounts.create({
        type: "express",
        email: shop.email,
        business_profile: { name: shop.name, url: `${env.appUrl}/shops` },
        capabilities: { transfers: { requested: true } },
        metadata: { shopId: shop.id },
      });
      accountId = account.id;
    }
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${env.appUrl}/vendor/settings?payouts=refresh`,
      return_url: `${env.appUrl}/vendor/settings?payouts=return`,
    });
    return { accountId, url: link.url };
  },

  async accountStatus(accountId) {
    const account = await stripe().accounts.retrieve(accountId);
    return {
      payoutsEnabled: account.capabilities?.transfers === "active" && Boolean(account.payouts_enabled),
    };
  },

  async dashboardLink(accountId) {
    const link = await stripe().accounts.createLoginLink(accountId);
    return link.url;
  },
};
