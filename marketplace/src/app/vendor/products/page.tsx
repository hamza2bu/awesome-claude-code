import Image from "next/image";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireShop } from "@/server/guards";

const FILTERS = ["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const;

export default async function VendorProductsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { shop } = await requireShop();
  const requested = (await searchParams).status;
  const status = FILTERS.find((f) => f === requested) ?? "ALL";
  const products = await prisma.product.findMany({
    where: { shopId: shop.id, ...(status !== "ALL" ? { status } : { status: { not: "ARCHIVED" } }) },
    orderBy: { updatedAt: "desc" },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, category: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/vendor/products/new" className="btn-primary">+ Add product</Link>
      </div>
      <div className="flex gap-1 overflow-x-auto text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/vendor/products" : `/vendor/products?status=${f}`}
            className={`rounded-full px-3 py-1 ${f === status ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState title="No products here" body="List your first product to start selling." href="/vendor/products/new" cta="Add product" />
      ) : (
        <ul className="card divide-y divide-slate-100">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/vendor/products/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 sm:p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatMoney(p.priceCents, p.currency)} · <span className={p.stock === 0 ? "text-red-600" : ""}>{p.stock} in stock</span>
                    {p.category && <span className="hidden sm:inline"> · {p.category.name}</span>}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
