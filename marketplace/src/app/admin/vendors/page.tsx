import Link from "next/link";
import type { ShopStatus } from "@prisma/client";
import { CommissionForm } from "@/components/commission-form";
import { EmptyState, StatusBadge } from "@/components/ui";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { setShopStatus } from "@/server/actions/admin";
import { requireRole } from "@/server/guards";

const STATUSES: ShopStatus[] = ["PENDING", "ACTIVE", "SUSPENDED"];

export default async function AdminVendorsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("ADMIN");
  const requested = (await searchParams).status;
  const status = STATUSES.find((s) => s === requested);
  const shops = await prisma.shop.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { owner: { select: { email: true, name: true } }, _count: { select: { products: true, vendorOrders: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Vendors</h1>
      <div className="flex gap-1 overflow-x-auto text-sm">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/vendors?status=${s}` : "/admin/vendors"}
            className={`rounded-full px-3 py-1 ${s === status ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
          >
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
          </Link>
        ))}
      </div>

      {shops.length === 0 ? (
        <EmptyState title="No shops" />
      ) : (
        <ul className="space-y-3">
          {shops.map((shop) => (
            <li key={shop.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    {shop.name} <StatusBadge status={shop.status} />
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {shop.owner.name} · {shop.owner.email} · {shop._count.products} products · {shop._count.vendorOrders} orders ·{" "}
                    payouts {shop.payoutsEnabled ? "enabled" : "not set up"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {shop.status !== "ACTIVE" && (
                    <form action={setShopStatus}>
                      <input type="hidden" name="shopId" value={shop.id} />
                      <input type="hidden" name="status" value="ACTIVE" />
                      <button className="btn-primary px-3 py-1.5">{shop.status === "PENDING" ? "Approve" : "Reactivate"}</button>
                    </form>
                  )}
                  {shop.status !== "SUSPENDED" && (
                    <form action={setShopStatus}>
                      <input type="hidden" name="shopId" value={shop.id} />
                      <input type="hidden" name="status" value="SUSPENDED" />
                      <button className="btn-danger px-3 py-1.5">Suspend</button>
                    </form>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-600">Commission:</span>
                <CommissionForm shopId={shop.id} bps={shop.commissionBps} defaultBps={env.defaultCommissionBps} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
