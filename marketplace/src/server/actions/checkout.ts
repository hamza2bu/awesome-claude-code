"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { paymentProviderName } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { loadCart, readCart } from "@/server/cart";
import { requireUser } from "@/server/guards";
import { abandonOrder, CheckoutError, markOrderPaid, placeOrder } from "@/server/orders";
import type { ActionState } from "./types";

const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name").max(100),
  line1: z.string().trim().min(3, "Enter a street address").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, "Enter a city").max(100),
  postalCode: z.string().trim().min(2, "Enter a postal code").max(20),
  country: z.string().trim().length(2, "Choose a country"),
  phone: z.string().trim().max(30).optional(),
});

export async function checkout(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/checkout");
  const address = addressSchema.safeParse(Object.fromEntries(formData));
  if (!address.success) return { fieldErrors: z.flattenError(address.error).fieldErrors };

  const { hasProblems } = await loadCart();
  if (hasProblems) return { error: "Some items in your cart need attention before checkout." };

  let redirectUrl: string;
  try {
    ({ redirectUrl } = await placeOrder({ id: user.id, email: user.email! }, await readCart(), address.data));
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    throw err;
  }
  redirect(redirectUrl);
}

/** Completes a payment on the built-in local provider's test payment page. */
export async function payLocalOrder(formData: FormData) {
  const user = await requireUser();
  if (paymentProviderName() !== "local") throw new Error("Local payments are disabled");
  const orderId = String(formData.get("orderId"));
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId: user.id } });
  if (!order) redirect("/account/orders");
  await markOrderPaid(order.id);
  redirect(`/checkout/success?order=${order.id}`);
}

export async function cancelPendingOrder(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId: user.id } });
  if (order) await abandonOrder(order.id);
  redirect("/cart");
}
