import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";

/**
 * Local marketplace provider for development and demos: a hosted "pay" page in the app
 * stands in for the card form, and transfers/refunds are recorded without moving money.
 * Swap for Stripe (or a regional PSP implementing `PaymentProvider`) in production.
 */
export const localProvider: PaymentProvider = {
  name: "local",

  async createCheckout(req) {
    const paymentRef = `local_pay_${randomUUID()}`;
    return { redirectUrl: `${env.appUrl}/checkout/pay/${req.orderId}`, paymentRef };
  },

  // Local payments are confirmed synchronously on the pay page.
  async isCheckoutPaid() {
    return false;
  },

  async cancelCheckout() {},

  async transfer() {
    return { transferId: `local_tr_${randomUUID()}` };
  },

  async refund() {
    return { refundId: `local_re_${randomUUID()}` };
  },

  async onboardingLink(shop) {
    const accountId = shop.stripeAccountId ?? `local_acct_${shop.id}`;
    return { accountId, url: `${env.appUrl}/vendor/settings?payouts=return` };
  },

  async accountStatus() {
    return { payoutsEnabled: true };
  },

  async dashboardLink() {
    return null;
  },
};
