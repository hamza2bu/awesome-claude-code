"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/server/actions/vendor";
import { SubmitButton } from "./submit-button";
import { FieldError, FormMessage } from "./ui";

export interface ProductFormValues {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  sku: string | null;
  categoryId: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  imageCount: number;
}

const cents = (v: number | null | undefined) => (v == null ? "" : (v / 100).toFixed(2));

export function ProductForm({
  product,
  categories,
  currency,
}: {
  product?: ProductFormValues;
  categories: { id: string; name: string; parentName: string | null }[];
  currency: string;
}) {
  const [state, action] = useActionState(saveProduct, {});
  const [previews, setPreviews] = useState<string[]>([]);
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      {product && <input type="hidden" name="productId" value={product.id} />}

      <section className="card space-y-4 p-4 sm:p-6">
        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" defaultValue={product?.title} required maxLength={140} className="input" />
          <FieldError errors={err.title} />
        </div>
        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" name="description" defaultValue={product?.description} rows={6} required className="input" />
          <FieldError errors={err.description} />
        </div>
        <div>
          <label htmlFor="categoryId" className="label">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className="input">
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} › ${c.name}` : c.name}</option>
            ))}
          </select>
          <FieldError errors={err.categoryId} />
        </div>
      </section>

      <section className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <div>
          <label htmlFor="price" className="label">Price ({currency.toUpperCase()})</label>
          <input id="price" name="price" inputMode="decimal" defaultValue={cents(product?.priceCents)} required placeholder="19.99" className="input" />
          <FieldError errors={err.price} />
        </div>
        <div>
          <label htmlFor="compareAt" className="label">Compare-at price (optional)</label>
          <input id="compareAt" name="compareAt" inputMode="decimal" defaultValue={cents(product?.compareAtCents)} placeholder="24.99" className="input" />
          <FieldError errors={err.compareAt} />
        </div>
        <div>
          <label htmlFor="stock" className="label">Stock</label>
          <input id="stock" name="stock" type="number" min={0} defaultValue={product?.stock ?? 1} required className="input" />
          <FieldError errors={err.stock} />
        </div>
        <div>
          <label htmlFor="sku" className="label">SKU (optional)</label>
          <input id="sku" name="sku" defaultValue={product?.sku ?? ""} className="input" />
        </div>
      </section>

      <section className="card space-y-3 p-4 sm:p-6">
        <label htmlFor="images" className="label">{product?.imageCount ? "Add more images" : "Images"}</label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700"
          onChange={(e) => {
            previews.forEach(URL.revokeObjectURL);
            setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)));
          }}
        />
        <p className="text-xs text-slate-500">JPEG, PNG, WebP or AVIF, up to 5 MB each, 8 images max. The first image is the cover.</p>
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img key={src} src={src} alt="" className="size-20 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-6">
        <div className="flex-1">
          <label htmlFor="status" className="label">Visibility</label>
          <select id="status" name="status" defaultValue={product?.status ?? "ACTIVE"} className="input">
            <option value="ACTIVE">Active — visible to customers</option>
            <option value="DRAFT">Draft — hidden</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <SubmitButton className="btn-primary sm:w-48" pendingText="Saving…">{product ? "Save changes" : "Create product"}</SubmitButton>
      </section>
      <FormMessage state={state} />
    </form>
  );
}
