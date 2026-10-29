import Link from "next/link";
import { ProductForm } from "@/components/product-form";
import { env } from "@/lib/env";
import { categoryOptions } from "@/server/categories";
import { requireShop } from "@/server/guards";

export default async function NewProductPage() {
  await requireShop();
  return (
    <div className="space-y-4">
      <Link href="/vendor/products" className="text-sm text-brand-600">← Products</Link>
      <h1 className="text-2xl font-bold">Add product</h1>
      <ProductForm categories={await categoryOptions()} currency={env.currency} />
    </div>
  );
}
