import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderSummary } from "@/components/order-summary";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/guards";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, customerId: user.id },
    include: {
      vendorOrders: {
        include: { shop: { select: { name: true, slug: true } }, items: { include: { product: { select: { slug: true } } } } },
      },
    },
  });
  if (!order) notFound();

  return (
    <div className="container-page max-w-5xl py-6">
      <Link href="/account/orders" className="text-sm text-brand-600">← All orders</Link>
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order {order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      {order.status === "PENDING_PAYMENT" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This order is awaiting payment. <Link className="font-semibold underline" href="/cart">Return to your cart</Link> to check out again.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {order.vendorOrders.map((vo) => (
            <section key={vo.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
                <span>Sold by <Link href={`/shops/${vo.shop.slug}`} className="font-semibold hover:text-brand-600">{vo.shop.name}</Link></span>
                <StatusBadge status={vo.status} />
              </header>
              {vo.trackingCode && (
                <p className="border-b border-slate-100 px-4 py-2 text-sm">
                  Tracking: <span className="font-mono font-medium">{vo.trackingCode}</span>
                </p>
              )}
              <ul className="divide-y divide-slate-100">
                {vo.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {item.product ? (
                        <Link href={`/products/${item.product.slug}`} className="line-clamp-2 font-medium hover:text-brand-600">{item.title}</Link>
                      ) : (
                        <p className="line-clamp-2 font-medium">{item.title}</p>
                      )}
                      <p className="text-sm text-slate-500">{item.quantity} × {formatMoney(item.unitCents, order.currency)}</p>
                      {item.product && ["DELIVERED", "SHIPPED"].includes(vo.status) && (
                        <Link href={`/products/${item.product.slug}#reviews`} className="text-sm font-medium text-brand-600">Write a review</Link>
                      )}
                    </div>
                    <p className="font-semibold">{formatMoney(item.lineCents, order.currency)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="space-y-4">
          <OrderSummary subtotalCents={order.subtotalCents} shippingCents={order.shippingCents} totalCents={order.totalCents} currency={order.currency} />
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Shipping to</h2>
            <address className="text-slate-600 not-italic">
              {order.shippingName}<br />
              {order.shippingLine1}<br />
              {order.shippingLine2 && <>{order.shippingLine2}<br /></>}
              {order.shippingPostalCode} {order.shippingCity}<br />
              {order.shippingCountry}
            </address>
          </div>
        </aside>
      </div>
    </div>
  );
}
