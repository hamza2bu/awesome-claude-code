import type { Metadata } from "next";
import Link from "next/link";
import { ShopAvatar } from "@/components/shop-avatar";
import { EmptyState } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Shops" };

export default async function ShopsPage() {
  const shops = await prisma.shop.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-2xl font-bold">Browse shops</h1>
      {shops.length === 0 ? (
        <EmptyState title="No shops yet" body="Be the first to open one." href="/sell" cta="Open a shop" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <Link key={s.id} href={`/shops/${s.slug}`} className="card flex items-center gap-4 p-4 hover:shadow-sm">
              <ShopAvatar name={s.name} logoUrl={s.logoUrl} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-sm text-slate-500">{s._count.products} products</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
