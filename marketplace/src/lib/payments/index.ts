import "server-only";
import { paymentProviderName } from "@/lib/env";
import { localProvider } from "./local";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export function paymentProvider(): PaymentProvider {
  return paymentProviderName() === "stripe" ? stripeProvider : localProvider;
}

export type { PaymentProvider } from "./types";
