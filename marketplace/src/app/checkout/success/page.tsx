import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { paymentProvider } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/guards";
import { markOrderPaid } from "@/server/orders";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Order placed" };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const user = await requireUser();
  const { order: orderId } = await searchParams;
  let order = orderId ? await prisma.order.findFirst({ where: { id: orderId, customerId: user.id } }) : null;
  if (!order) notFound();

  // The redirect can beat the webhook; confirm directly with the provider so the customer sees the result.
  if (order.status === "PENDING_PAYMENT" && order.paymentRef && (await paymentProvider().isCheckoutPaid(order.paymentRef))) {
    await markOrderPaid(order.id);
    order = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  }

  const confirmed = order.status !== "PENDING_PAYMENT";
  return (
    <div className="container-page max-w-xl py-12 text-center">
      <ClearCart />
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
      <h1 className="text-2xl font-bold">Thank you for your order!</h1>
      <p className="mt-2 text-slate-600">
        Order <span className="font-semibold">{order.number}</span> · {formatMoney(order.totalCents, order.currency)}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {confirmed
          ? "Your payment is confirmed. Each shop will ship its items and you'll see tracking in your orders."
          : "We're confirming your payment — this page will show the order as paid within a few moments."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/account/orders/${order.id}`} className="btn-primary">View order</Link>
        <Link href="/products" className="btn-secondary">Continue shopping</Link>
      </div>
    </div>
  );
}
