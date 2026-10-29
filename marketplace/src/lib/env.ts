/** Centralised, typed access to runtime configuration. */
export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  currency: (process.env.MARKETPLACE_CURRENCY ?? "usd").toLowerCase(),
  /** Platform commission in basis points (1000 = 10%), overridable per shop. */
  defaultCommissionBps: Number(process.env.DEFAULT_COMMISSION_BPS ?? 1000),
  /** Flat shipping fee charged per shop in an order, in minor units. */
  shippingPerShopCents: Number(process.env.SHIPPING_PER_SHOP_CENTS ?? 499),
  /** Orders whose per-shop subtotal reaches this amount ship free from that shop. */
  freeShippingThresholdCents: Number(process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 5000),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

export type PaymentProviderName = "stripe" | "local";

export function paymentProviderName(): PaymentProviderName {
  const configured = process.env.PAYMENT_PROVIDER;
  if (configured === "stripe" || configured === "local") return configured;
  if (env.stripeSecretKey) return "stripe";
  // The local provider lets anyone "pay" with a button, so production must opt in explicitly.
  if (process.env.NODE_ENV === "production") {
    throw new Error("No payment provider configured: set STRIPE_SECRET_KEY, or PAYMENT_PROVIDER=local for demos");
  }
  return "local";
}
