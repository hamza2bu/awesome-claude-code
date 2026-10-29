import { Pagination, StatusBadge } from "@/components/ui";
import { parsePage } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/guards";

const PER_PAGE = 30;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole("ADMIN");
  const page = parsePage((await searchParams).page);
  const where = { NOT: { status: "CANCELLED" as const, paidAt: null } };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { customer: { select: { email: true } }, vendorOrders: { include: { shop: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-slate-100 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Shops</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 text-right font-medium">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <td className="px-4 py-2">
                  <p className="font-medium">{o.number}</p>
                  <p className="text-xs text-slate-500">{o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} · {o.paymentProvider}</p>
                </td>
                <td className="px-4 py-2">{o.customer.email}</td>
                <td className="space-y-1 px-4 py-2">
                  {o.vendorOrders.map((vo) => (
                    <p key={vo.id} className="flex items-center gap-1.5">
                      <span className="truncate">{vo.shop.name}</span> <StatusBadge status={vo.payoutStatus} />
                    </p>
                  ))}
                </td>
                <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2 text-right">{formatMoney(o.totalCents, o.currency)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(o.commissionCents, o.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} makeHref={(p) => `/admin/orders?page=${p}`} />
    </div>
  );
}
