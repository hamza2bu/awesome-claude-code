import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FulfilmentForm } from "@/components/fulfilment-form";
import { StatusBadge } from "@/components/ui";
import { formatBps, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireShop } from "@/server/guards";
import { nextStatuses } from "@/server/orders";

export default async function VendorOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { shop } = await requireShop();
  const { id } = await params;
  const vo = await prisma.vendorOrder.findFirst({
    where: { id, shopId: shop.id, status: { not: "PENDING_PAYMENT" } },
    include: { order: true, items: true },
  });
  if (!vo) notFound();
  const currency = vo.order.currency;
  const money = (c: number) => formatMoney(c, currency);

  return (
    <div className="space-y-4">
      <Link href="/vendor/orders" className="text-sm text-brand-600">← Orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order {vo.order.number}</h1>
        <StatusBadge status={vo.status} />
      </div>
      <p className="text-sm text-slate-500">Placed {vo.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <section className="card divide-y divide-slate-100">
            {vo.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.quantity} × {money(item.unitCents)}</p>
                </div>
                <p className="font-semibold">{money(item.lineCents)}</p>
              </div>
            ))}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-semibold">Earnings</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-600">Items</dt><dd>{money(vo.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Shipping charged</dt><dd>{money(vo.shippingCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Commission ({formatBps(vo.commissionBps)})</dt><dd>−{money(vo.commissionCents)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold"><dt>Your payout</dt><dd>{money(vo.payoutCents)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-slate-600">Payout status</dt><dd><StatusBadge status={vo.payoutStatus} /></dd></div>
            </dl>
            {vo.payoutStatus === "PENDING" && ["SHIPPED", "DELIVERED"].includes(vo.status) && !shop.payoutsEnabled && (
              <p className="mt-3 text-sm text-amber-700">
                <Link href="/vendor/settings" className="font-semibold underline">Connect payouts</Link> to receive this transfer.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <FulfilmentForm vendorOrderId={vo.id} next={nextStatuses(vo.status)} />
          {vo.trackingCode && (
            <div className="card p-4 text-sm">
              <p className="font-semibold">Tracking</p>
              <p className="font-mono">{vo.trackingCode}</p>
            </div>
          )}
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Ship to</h2>
            <address className="text-slate-600 not-italic">
              {vo.order.shippingName}<br />
              {vo.order.shippingLine1}<br />
              {vo.order.shippingLine2 && <>{vo.order.shippingLine2}<br /></>}
              {vo.order.shippingPostalCode} {vo.order.shippingCity}<br />
              {vo.order.shippingCountry}
              {vo.order.shippingPhone && <><br />{vo.order.shippingPhone}</>}
            </address>
          </div>
        </aside>
      </div>
    </div>
  );
}
