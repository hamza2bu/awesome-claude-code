import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileCollapsible } from "@/components/collapsible";
import { ProductGrid, productCardSelect } from "@/components/product-card";
import { ShopAvatar } from "@/components/shop-avatar";
import { EmptyState, Pagination, Stars } from "@/components/ui";
import { catalogWhere, PAGE_SIZE, parseAmount, parsePage, parseSort, SORTS } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

type Params = Record<string, string | undefined>;

const getShop = cache((slug: string) => prisma.shop.findUnique({ where: { slug } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const shop = await getShop((await params).slug);
  return shop ? { title: shop.name, description: shop.description ?? undefined } : {};
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Params> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const shop = await getShop(slug);
  if (!shop || shop.status !== "ACTIVE") notFound();

  const page = parsePage(query.page);
  const where = catalogWhere({
    shopId: shop.id,
    q: query.q,
    minCents: parseAmount(query.min),
    maxCents: parseAmount(query.max),
    inStock: query.instock === "1",
  });
  const [total, products, rating] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: SORTS[parseSort(query.sort)].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: productCardSelect,
    }),
    prisma.review.aggregate({ where: { product: { shopId: shop.id } }, _avg: { rating: true }, _count: true }),
  ]);

  const makeHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => !!e[1]));
    next.set("page", String(p));
    return `/shops/${shop.slug}?${next}`;
  };

  return (
    <div>
      <div
        className="h-32 bg-gradient-to-r from-brand-600 to-brand-500 bg-cover bg-center sm:h-48"
        style={shop.bannerUrl ? { backgroundImage: `url(${JSON.stringify(shop.bannerUrl)})` } : undefined}
      />
      <div className="container-page">
        <div className="-mt-10 flex flex-wrap items-end gap-4">
          <div className="rounded-full bg-white p-1 shadow">
            <ShopAvatar name={shop.name} logoUrl={shop.logoUrl} size={80} />
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <p className="flex items-center gap-2 text-sm text-slate-500">
              {rating._count > 0 ? <Stars value={rating._avg.rating ?? 0} count={rating._count} /> : "New seller"}
              <span>· {total} products</span>
            </p>
          </div>
        </div>
        {shop.description && <p className="mt-4 max-w-3xl whitespace-pre-line text-slate-700">{shop.description}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <aside>
            <MobileCollapsible label="Filters & sort">
              <form action={`/shops/${shop.slug}`} className="mb-4">
                <label htmlFor="shop-q" className="label">Search this shop</label>
                <input id="shop-q" name="q" defaultValue={query.q} className="input" type="search" />
              </form>
              <CatalogFilters action={`/shops/${shop.slug}`} params={query} />
            </MobileCollapsible>
          </aside>
          <section>
            {products.length ? <ProductGrid products={products} /> : <EmptyState title="No products found" />}
            <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} makeHref={makeHref} />
          </section>
        </div>
      </div>
    </div>
  );
}
