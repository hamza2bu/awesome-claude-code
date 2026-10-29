import Image from "next/image";
import Link from "next/link";
import { Price, Stars } from "./ui";

export interface ProductCardData {
  slug: string;
  title: string;
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  ratingAvg: number;
  ratingCount: number;
  stock: number;
  images: { url: string; alt: string | null }[];
  shop: { name: string; slug: string };
}

export const productCardSelect = {
  slug: true,
  title: true,
  priceCents: true,
  compareAtCents: true,
  currency: true,
  ratingAvg: true,
  ratingCount: true,
  stock: true,
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" as const }, take: 1 },
  shop: { select: { name: true, slug: true } },
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-square bg-slate-100">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.title}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-400">No image</div>
        )}
        {product.stock === 0 && (
          <span className="absolute top-2 left-2 rounded bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white">Sold out</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-800">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>
        {product.ratingCount > 0 && <Stars value={product.ratingAvg} count={product.ratingCount} />}
        <Price cents={product.priceCents} compareAt={product.compareAtCents} currency={product.currency} className="mt-auto pt-1" />
        <p className="truncate text-xs text-slate-500">by {product.shop.name}</p>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: (ProductCardData & { id?: string })[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
