import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { SubmitButton } from "@/components/submit-button";
import { StatCard } from "@/components/ui";
import { daysAgo } from "@/lib/dates";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { retryPayouts } from "@/server/actions/admin";
import { requireRole } from "@/server/guards";

export default async function AdminOverviewPage() {
  await requireRole("ADMIN");
  const since = daysAgo(30);
  const earning: Prisma.VendorOrderWhereInput = { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } };

  const [gmv, gmv30, pendingShops, activeShops, customers, payoutsDue, failedPayouts, topShops] = await Promise.all([
    prisma.vendorOrder.aggregate({ where: earning, _sum: { subtotalCents: true, commissionCents: true }, _count: true }),
    prisma.vendorOrder.aggregate({ where: { ...earning, createdAt: { gte: since } }, _sum: { subtotalCents: true, commissionCents: true } }),
    prisma.shop.count({ where: { status: "PENDING" } }),
    prisma.shop.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.vendorOrder.aggregate({ where: { ...earning, payoutStatus: "PENDING" }, _sum: { payoutCents: true } }),
    prisma.vendorOrder.count({ where: { payoutStatus: "FAILED" } }),
    prisma.vendorOrder.groupBy({
      by: ["shopId"],
      where: { ...earning, createdAt: { gte: since } },
      _sum: { subtotalCents: true, commissionCents: true },
      orderBy: { _sum: { subtotalCents: "desc" } },
      take: 5,
    }),
  ]);
  const shopNames = new Map(
    (await prisma.shop.findMany({ where: { id: { in: topShops.map((s) => s.shopId) } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]),
  );
  const money = (c: number | null) => formatMoney(c ?? 0, env.currency);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="GMV (30 days)" value={money(gmv30._sum.subtotalCents)} hint={`All time ${money(gmv._sum.subtotalCents)}`} />
        <StatCard label="Commission (30 days)" value={money(gmv30._sum.commissionCents)} hint={`All time ${money(gmv._sum.commissionCents)}`} />
        <StatCard label="Active shops" value={activeShops} hint={`${pendingShops} awaiting approval`} />
        <StatCard label="Customers" value={customers} hint={`${gmv._count} paid vendor orders`} />
      </div>

      {pendingShops > 0 && (
        <Link href="/admin/vendors?status=PENDING" className="block rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
          {pendingShops} shop{pendingShops > 1 ? "s are" : " is"} waiting for approval → Review
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <h2 className="border-b border-slate-100 px-4 py-3 font-semibold">Top shops (30 days)</h2>
          {topShops.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr><th className="px-4 py-2 font-medium">Shop</th><th className="px-4 py-2 text-right font-medium">Sales</th><th className="px-4 py-2 text-right font-medium">Commission</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topShops.map((s) => (
                  <tr key={s.shopId}>
                    <td className="truncate px-4 py-2">{shopNames.get(s.shopId)}</td>
                    <td className="px-4 py-2 text-right">{money(s._sum.subtotalCents)}</td>
                    <td className="px-4 py-2 text-right">{money(s._sum.commissionCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Payouts</h2>
          <p className="text-sm text-slate-600">
            {money(payoutsDue._sum.payoutCents)} owed to vendors for paid orders (released as orders ship).
            {failedPayouts > 0 && <span className="font-semibold text-red-600"> {failedPayouts} transfer(s) failed.</span>}
          </p>
          <form action={retryPayouts}>
            <SubmitButton className="btn-secondary" pendingText="Retrying…">Retry due payouts</SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
