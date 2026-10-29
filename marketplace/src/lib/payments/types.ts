export interface CheckoutLine {
  name: string;
  imageUrl: string | null;
  unitCents: number;
  quantity: number;
}

export interface CheckoutRequest {
  orderId: string;
  orderNumber: string;
  currency: string;
  customerEmail: string;
  transferGroup: string;
  lines: CheckoutLine[];
  successUrl: string;
  cancelUrl: string;
}

export interface TransferRequest {
  vendorOrderId: string;
  destinationAccountId: string;
  amountCents: number;
  currency: string;
  transferGroup: string;
  /** Provider reference of the original charge (lets Stripe transfer before funds settle). */
  paymentRef: string;
}

export interface RefundRequest {
  paymentRef: string;
  amountCents: number;
  reason: string;
}

/**
 * A marketplace payment provider: one charge to the customer, followed by separate
 * transfers to each vendor's connected account (platform keeps the commission).
 */
export interface PaymentProvider {
  readonly name: "stripe" | "local";
  createCheckout(req: CheckoutRequest): Promise<{ redirectUrl: string; paymentRef: string }>;
  /** Asks the provider whether a checkout has been paid (fallback for delayed webhooks). */
  isCheckoutPaid(paymentRef: string): Promise<boolean>;
  /** Invalidates an unpaid checkout so it can no longer be paid. */
  cancelCheckout(paymentRef: string): Promise<void>;
  transfer(req: TransferRequest): Promise<{ transferId: string }>;
  refund(req: RefundRequest): Promise<{ refundId: string }>;
  /** Creates (if needed) the vendor's connected account and returns an onboarding URL. */
  onboardingLink(shop: {
    id: string;
    email: string;
    name: string;
    stripeAccountId: string | null;
  }): Promise<{ accountId: string; url: string }>;
  accountStatus(accountId: string): Promise<{ payoutsEnabled: boolean }>;
  dashboardLink(accountId: string): Promise<string | null>;
}
