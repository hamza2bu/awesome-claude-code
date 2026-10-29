import Link from "next/link";
import { ProductGrid, productCardSelect } from "@/components/product-card";
import { ShopAvatar } from "@/components/shop-avatar";
import { prisma } from "@/lib/prisma";

const visible = { status: "ACTIVE" as const, shop: { status: "ACTIVE" as const } };

export default async function HomePage() {
  const [newest, topRated, categories, shops] = await Promise.all([
    prisma.product.findMany({ where: visible, orderBy: { createdAt: "desc" }, take: 10, select: productCardSelect }),
    prisma.product.findMany({
      where: { ...visible, ratingCount: { gt: 0 } },
      orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
      take: 5,
      select: productCardSelect,
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: visible } } } },
    }),
    prisma.shop.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <div className="space-y-12 pb-8">
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
        <div className="container-page grid gap-6 py-10 sm:py-16 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Independent shops. One cart.</h1>
            <p className="mt-4 max-w-md text-brand-100 sm:text-lg">
              Discover products from hundreds of sellers and check out once — we split your payment with every shop.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="btn-accent px-6 py-3 text-base">Start shopping</Link>
              <Link href="/sell" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">Sell with us</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Secure checkout", "One payment for every shop in your cart"],
              ["Verified sellers", "Shops are reviewed before they go live"],
              ["Buyer protection", "Sellers are paid once your order ships"],
              ["Real reviews", "Only verified buyers can leave a rating"],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-brand-100">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-page">
          <h2 className="mb-4 text-xl font-bold">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="card p-4 transition hover:border-brand-500 hover:shadow-sm">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-slate-500">{c._count.products} products</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">New arrivals</h2>
          <Link href="/products?sort=newest" className="text-sm font-semibold text-brand-600">See all →</Link>
        </div>
        {newest.length ? <ProductGrid products={newest} /> : <p className="text-slate-500">No products yet — check back soon.</p>}
      </section>

      {topRated.length > 0 && (
        <section className="container-page">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">Top rated</h2>
            <Link href="/products?sort=rating" className="text-sm font-semibold text-brand-600">See all →</Link>
          </div>
          <ProductGrid products={topRated} />
        </section>
      )}

      {shops.length > 0 && (
        <section className="container-page">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">Featured shops</h2>
            <Link href="/shops" className="text-sm font-semibold text-brand-600">All shops →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link key={s.id} href={`/shops/${s.slug}`} className="card flex items-center gap-4 p-4 hover:shadow-sm">
                <ShopAvatar name={s.name} logoUrl={s.logoUrl} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="line-clamp-1 text-sm text-slate-500">{s.description ?? "Independent seller"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
