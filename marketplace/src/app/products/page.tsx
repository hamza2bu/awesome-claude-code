import type { Metadata } from "next";
import { CatalogFilters } from "@/components/catalog-filters";
import { MobileCollapsible } from "@/components/collapsible";
import { ProductGrid, productCardSelect } from "@/components/product-card";
import { EmptyState, Pagination } from "@/components/ui";
import { catalogWhere, PAGE_SIZE, parseAmount, parsePage, parseSort, SORTS } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

type Params = Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Results for “${q}”` : "All products" };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = parseSort(params.sort);

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { children: true } });
  const category = categories.find((c) => c.slug === params.category);
  // Selecting a parent category includes products in its sub-categories.
  const categoryIds = category ? [category.id, ...category.children.map((c) => c.id)] : undefined;

  const where = catalogWhere({
    q: params.q,
    categoryIds,
    minCents: parseAmount(params.min),
    maxCents: parseAmount(params.max),
    inStock: params.instock === "1",
  });

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: productCardSelect,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const heading = params.q ? `Results for “${params.q}”` : (category?.name ?? "All products");
  const makeHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
    next.set("page", String(p));
    return `/products?${next}`;
  };

  return (
    <div className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="text-sm text-slate-500">{total.toLocaleString()} products</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside>
          <MobileCollapsible label="Filters & sort">
            <CatalogFilters action="/products" params={params} categories={categories} />
          </MobileCollapsible>
        </aside>

        <section>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <EmptyState title="No products match" body="Try a different search or remove some filters." href="/products" cta="Clear filters" />
          )}
          <Pagination page={page} pages={pages} makeHref={makeHref} />
        </section>
      </div>
    </div>
  );
}
