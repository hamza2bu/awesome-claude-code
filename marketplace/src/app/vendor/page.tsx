import Link from "next/link";
import { StatCard, StatusBadge } from "@/components/ui";
import { formatBps, formatMoney } from "@/lib/money";
import { daysAgo } from "@/lib/dates";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { requireShop } from "@/server/guards";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function VendorOverviewPage() {
  const { shop } = await requireShop();
  const since = daysAgo(30);

  const [sales30, pending, transferred, toShip, lowStock, recent] = await Promise.all([
    prisma.vendorOrder.aggregate({
      where: { shopId: shop.id, status: { in: [...PAID_STATUSES] }, createdAt: { gte: since } },
      _sum: { subtotalCents: true, commissionCents: true },
      _count: true,
    }),
    prisma.vendorOrder.aggregate({
      where: { shopId: shop.id, payoutStatus: { in: ["PENDING", "FAILED"] }, status: { in: [...PAID_STATUSES] } },
      _sum: { payoutCents: true },
    }),
    prisma.vendorOrder.aggregate({ where: { shopId: shop.id, payoutStatus: "TRANSFERRED" }, _sum: { payoutCents: true } }),
    prisma.vendorOrder.count({ where: { shopId: shop.id, status: { in: ["PAID", "PROCESSING"] } } }),
    prisma.product.findMany({
      where: { shopId: shop.id, status: "ACTIVE", stock: { lte: 3 } },
      orderBy: { stock: "asc" },
      take: 5,
      select: { id: true, title: true, stock: true },
    }),
    prisma.vendorOrder.findMany({
      where: { shopId: shop.id, status: { not: "PENDING_PAYMENT" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { order: { select: { number: true, shippingName: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Sales (30 days)" value={formatMoney(sales30._sum.subtotalCents ?? 0, env.currency)} hint={`${sales30._count} orders`} />
        <StatCard label="To ship" value={toShip} hint="Paid orders awaiting shipment" />
        <StatCard label="Pending payouts" value={formatMoney(pending._sum.payoutCents ?? 0, env.currency)} hint="Released when you ship" />
        <StatCard label="Paid out" value={formatMoney(transferred._sum.payoutCents ?? 0, env.currency)} hint={`Commission rate ${formatBps(shop.commissionBps ?? env.defaultCommissionBps)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/vendor/orders" className="text-sm font-semibold text-brand-600">All orders</Link>
          </header>
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((vo) => (
                <li key={vo.id}>
                  <Link href={`/vendor/orders/${vo.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{vo.order.number}</p>
                      <p className="truncate text-slate-500">{vo.order.shippingName}</p>
                    </div>
                    <StatusBadge status={vo.status} />
                    <span className="font-semibold">{formatMoney(vo.subtotalCents, env.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold">Low stock</h2>
            <Link href="/vendor/products/new" className="text-sm font-semibold text-brand-600">Add product</Link>
          </header>
          {lowStock.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">All active products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/vendor/products/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                    <span className="truncate">{p.title}</span>
                    <span className={p.stock === 0 ? "font-semibold text-red-600" : "font-semibold text-amber-700"}>{p.stock} left</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
