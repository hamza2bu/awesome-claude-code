import Link from "next/link";
import type { VendorOrderStatus } from "@prisma/client";
import { EmptyState, Pagination, StatusBadge } from "@/components/ui";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { parsePage } from "@/lib/catalog";
import { requireShop } from "@/server/guards";

const TABS: { key: string; label: string; statuses?: VendorOrderStatus[] }[] = [
  { key: "open", label: "To fulfil", statuses: ["PAID", "PROCESSING"] },
  { key: "shipped", label: "Shipped", statuses: ["SHIPPED"] },
  { key: "done", label: "Completed", statuses: ["DELIVERED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REFUNDED"] },
  { key: "all", label: "All" },
];
const PER_PAGE = 25;

export default async function VendorOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const { shop } = await requireShop();
  const params = await searchParams;
  const tab = TABS.find((t) => t.key === params.tab) ?? TABS[0];
  const page = parsePage(params.page);
  const where = {
    shopId: shop.id,
    status: tab.statuses ? { in: tab.statuses } : { not: "PENDING_PAYMENT" as const },
  };

  const [total, orders] = await Promise.all([
    prisma.vendorOrder.count({ where }),
    prisma.vendorOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { order: { select: { number: true, shippingName: true, shippingCity: true } }, items: { select: { quantity: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="flex gap-1 overflow-x-auto text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/vendor/orders?tab=${t.key}`}
            className={`rounded-full px-3 py-1 whitespace-nowrap ${t.key === tab.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Nothing here" body="Orders appear once customers pay." />
      ) : (
        <ul className="card divide-y divide-slate-100">
          {orders.map((vo) => (
            <li key={vo.id}>
              <Link href={`/vendor/orders/${vo.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{vo.order.number}</p>
                  <p className="truncate text-sm text-slate-500">
                    {vo.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} · {vo.items.reduce((n, i) => n + i.quantity, 0)} items ·{" "}
                    {vo.order.shippingName}, {vo.order.shippingCity}
                  </p>
                </div>
                <StatusBadge status={vo.status} />
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(vo.payoutCents, env.currency)}</p>
                  <p className="text-xs text-slate-500">your payout</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} makeHref={(p) => `/vendor/orders?tab=${tab.key}&page=${p}`} />
    </div>
  );
}
