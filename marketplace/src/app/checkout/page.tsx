import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { OrderSummary } from "@/components/order-summary";
import { paymentProviderName } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { cartSummary } from "@/server/cart-summary";
import { requireUser } from "@/server/guards";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const { groups, totals, hasProblems, isEmpty, currency } = await cartSummary();
  if (isEmpty || hasProblems) redirect("/cart");

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-2xl font-bold">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <CheckoutForm
          defaultName={user.name ?? undefined}
          totalLabel={formatMoney(totals.totalCents, currency)}
          providerLabel={paymentProviderName() === "stripe" ? "Stripe" : "the test payment page"}
        />
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <OrderSummary {...totals} currency={currency} />
          <div className="card divide-y divide-slate-100 text-sm">
            {groups.map(({ shop, lines }) => (
              <div key={shop.id} className="p-4">
                <p className="mb-1 font-semibold">{shop.name}</p>
                {lines.map((l) => (
                  <p key={l.product.id} className="flex justify-between gap-2 text-slate-600">
                    <span className="truncate">{l.quantity} × {l.product.title}</span>
                    <span>{formatMoney(l.product.priceCents * l.quantity, currency)}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
