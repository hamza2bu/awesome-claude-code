import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { StatusBadge } from "@/components/ui";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { deleteProductImage } from "@/server/actions/vendor";
import { categoryOptions } from "@/server/categories";
import { requireShop } from "@/server/guards";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { shop } = await requireShop();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const product = await prisma.product.findFirst({
    where: { id, shopId: shop.id },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <Link href="/vendor/products" className="text-sm text-brand-600">← Products</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Edit product</h1>
        <StatusBadge status={product.status} />
        <Link href={`/products/${product.slug}`} className="ml-auto text-sm font-semibold text-brand-600">View listing →</Link>
      </div>
      {created && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Product created.</p>}

      {product.images.length > 0 && (
        <section className="card p-4 sm:p-6">
          <h2 className="mb-3 font-semibold">Images</h2>
          <ul className="flex flex-wrap gap-3">
            {product.images.map((img, i) => (
              <li key={img.id} className="relative">
                <div className="relative size-24 overflow-hidden rounded-lg bg-slate-100">
                  <Image src={img.url} alt={img.alt ?? ""} fill sizes="96px" className="object-cover" />
                </div>
                {i === 0 && <span className="absolute top-1 left-1 rounded bg-slate-900/80 px-1.5 text-[10px] font-semibold text-white">Cover</span>}
                <form action={deleteProductImage} className="absolute -top-2 -right-2">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button aria-label="Remove image" className="grid size-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow hover:text-red-600">×</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductForm
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          stock: product.stock,
          sku: product.sku,
          categoryId: product.categoryId,
          status: product.status,
          imageCount: product.images.length,
        }}
        categories={await categoryOptions()}
        currency={env.currency}
      />
    </div>
  );
}
