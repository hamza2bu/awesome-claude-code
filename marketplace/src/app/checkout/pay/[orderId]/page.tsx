import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { paymentProviderName } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { cancelPendingOrder, payLocalOrder } from "@/server/actions/checkout";
import { requireUser } from "@/server/guards";

export const metadata: Metadata = { title: "Payment" };

/** Hosted payment page of the built-in local provider (development / demo only). */
export default async function LocalPayPage({ params }: { params: Promise<{ orderId: string }> }) {
  if (paymentProviderName() !== "local") notFound();
  const user = await requireUser();
  const { orderId } = await params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: user.id },
    include: { vendorOrders: { include: { shop: true } } },
  });
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/account/orders/${order.id}`);

  return (
    <div className="container-page max-w-lg py-10">
      <div className="card space-y-5 p-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">Test payment</p>
          <h1 className="mt-1 text-2xl font-bold">Pay {formatMoney(order.totalCents, order.currency)}</h1>
          <p className="text-sm text-slate-500">Order {order.number}</p>
        </div>
        <ul className="space-y-1 text-sm text-slate-600">
          {order.vendorOrders.map((vo) => (
            <li key={vo.id} className="flex justify-between">
              <span>{vo.shop.name}</span>
              <span>{formatMoney(vo.subtotalCents + vo.shippingCents, order.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          The local payment provider simulates a card payment. Configure <code>STRIPE_SECRET_KEY</code> to take real payments.
        </p>
        <form action={payLocalOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <SubmitButton className="btn-accent w-full py-3 text-base" pendingText="Processing…">Complete test payment</SubmitButton>
        </form>
        <form action={cancelPendingOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <button className="btn-secondary w-full">Cancel and return to cart</button>
        </form>
      </div>
    </div>
  );
}
