import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { AddToCart } from "@/components/add-to-cart";
import { ImageGallery } from "@/components/image-gallery";
import { ProductGrid, productCardSelect } from "@/components/product-card";
import { ReviewForm } from "@/components/review-form";
import { ShopAvatar } from "@/components/shop-avatar";
import { Price, Stars } from "@/components/ui";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const getProduct = cache((slug: string) =>
  prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      shop: true,
      category: { include: { parent: true } },
      reviews: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.title,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images[0] ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, session] = await Promise.all([getProduct(slug), auth()]);
  const user = session?.user;
  const isOwner = !!user && product?.shop.ownerId === user.id;
  const visible = product && product.status === "ACTIVE" && product.shop.status === "ACTIVE";
  // Sellers and admins can preview listings that aren't public yet.
  if (!product || (!visible && !isOwner && user?.role !== "ADMIN")) notFound();

  const [canReview, myReview, moreFromShop] = await Promise.all([
    user
      ? prisma.orderItem.findFirst({
          where: {
            productId: product.id,
            vendorOrder: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, order: { customerId: user.id } },
          },
          select: { id: true },
        })
      : null,
    user ? prisma.review.findUnique({ where: { productId_userId: { productId: product.id, userId: user.id } } }) : null,
    prisma.product.findMany({
      where: { shopId: product.shopId, status: "ACTIVE", id: { not: product.id } },
      orderBy: { ratingCount: "desc" },
      take: 5,
      select: productCardSelect,
    }),
  ]);

  return (
    <div className="container-page py-6">
      {!visible && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Preview — this listing isn&apos;t visible to customers ({product.shop.status !== "ACTIVE" ? "shop awaiting approval" : product.status.toLowerCase()}).
        </p>
      )}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap gap-1 text-sm text-slate-500">
        <Link href="/products" className="hover:text-brand-600">Products</Link>
        {product.category?.parent && (
          <>
            <span>/</span>
            <Link href={`/products?category=${product.category.parent.slug}`} className="hover:text-brand-600">{product.category.parent.name}</Link>
          </>
        )}
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand-600">{product.category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <ImageGallery images={product.images} title={product.title} />

        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{product.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {product.ratingCount > 0 ? <Stars value={product.ratingAvg} count={product.ratingCount} /> : <span className="text-slate-500">No reviews yet</span>}
              {product.sku && <span className="text-slate-400">SKU {product.sku}</span>}
            </div>
          </div>

          <Price cents={product.priceCents} compareAt={product.compareAtCents} currency={product.currency} className="text-3xl" />

          <p className={`text-sm font-medium ${product.stock > 5 ? "text-emerald-700" : product.stock > 0 ? "text-amber-700" : "text-slate-500"}`}>
            {product.stock > 5 ? "In stock" : product.stock > 0 ? `Only ${product.stock} left` : "Out of stock"}
          </p>

          {isOwner ? (
            <Link href={`/vendor/products/${product.id}`} className="btn-secondary">Edit this listing</Link>
          ) : (
            <AddToCart productId={product.id} stock={visible ? product.stock : 0} />
          )}

          <p className="text-sm text-slate-600">
            Ships from {product.shop.name}. Free shipping on orders from this shop over{" "}
            {formatMoney(env.freeShippingThresholdCents, product.currency)}.
          </p>

          <Link href={`/shops/${product.shop.slug}`} className="card flex items-center gap-3 p-4 hover:shadow-sm">
            <ShopAvatar name={product.shop.name} logoUrl={product.shop.logoUrl} size={40} />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Sold by</p>
              <p className="truncate font-semibold">{product.shop.name}</p>
            </div>
            <span className="ml-auto text-sm font-semibold text-brand-600">Visit shop →</span>
          </Link>
        </div>
      </div>

      <section className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="mb-3 text-xl font-bold">Description</h2>
          <div className="card p-4 whitespace-pre-line text-slate-700 sm:p-6">{product.description}</div>
        </div>
        <div id="reviews" className="scroll-mt-36 space-y-4">
          <h2 className="text-xl font-bold">Reviews</h2>
          {canReview && !isOwner && (
            <ReviewForm productId={product.id} existing={myReview ? { rating: myReview.rating, comment: myReview.comment } : undefined} />
          )}
          {product.reviews.length === 0 && <p className="text-sm text-slate-500">No reviews yet.</p>}
          <ul className="space-y-3">
            {product.reviews.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <time className="text-xs text-slate-400" dateTime={r.createdAt.toISOString()}>
                    {r.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </time>
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                <p className="mt-2 text-xs text-slate-500">{r.user.name ?? "Customer"} · Verified purchase</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {moreFromShop.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">More from {product.shop.name}</h2>
          <ProductGrid products={moreFromShop} />
        </section>
      )}
    </div>
  );
}
