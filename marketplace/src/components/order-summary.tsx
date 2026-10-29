import { formatMoney } from "@/lib/money";

export function OrderSummary({
  subtotalCents,
  shippingCents,
  totalCents,
  currency,
  children,
}: {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card space-y-3 p-4 sm:p-5">
      <h2 className="font-semibold">Order summary</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-slate-600">Items</dt><dd>{formatMoney(subtotalCents, currency)}</dd></div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Shipping</dt>
          <dd>{shippingCents === 0 ? "Free" : formatMoney(shippingCents, currency)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
          <dt>Total</dt><dd>{formatMoney(totalCents, currency)}</dd>
        </div>
      </dl>
      {children}
    </div>
  );
}
