import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/guards";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await prisma.order.findMany({
    where: { customerId: user.id, NOT: { status: "CANCELLED", paidAt: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { vendorOrders: { include: { shop: { select: { name: true } }, items: { select: { quantity: true } } } } },
  });

  return (
    <div className="container-page max-w-4xl py-6">
      <h1 className="mb-4 text-2xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" body="When you buy something it will show up here." href="/products" cta="Start shopping" />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const items = order.vendorOrders.reduce((n, vo) => n + vo.items.reduce((m, i) => m + i.quantity, 0), 0);
            return (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`} className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{order.number}</p>
                    <p className="text-sm text-slate-500">
                      {order.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} · {items} items from{" "}
                      {order.vendorOrders.map((vo) => vo.shop.name).join(", ")}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                  <p className="font-semibold">{formatMoney(order.totalCents, order.currency)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
