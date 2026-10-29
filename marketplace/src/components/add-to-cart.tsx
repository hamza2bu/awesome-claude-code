"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addToCart } from "@/server/actions/cart";
import { SubmitButton } from "./submit-button";

export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const [state, action] = useActionState(addToCart, {});

  if (stock === 0) {
    return <p className="rounded-lg bg-slate-100 px-4 py-3 font-medium text-slate-600">Currently out of stock</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex gap-3">
        <label className="sr-only" htmlFor="quantity">Quantity</label>
        <select id="quantity" name="quantity" className="input w-24" defaultValue="1">
          {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <SubmitButton className="btn-accent flex-1 py-3 text-base" pendingText="Adding…">Add to cart</SubmitButton>
      </div>
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success} · <Link href="/cart" className="font-semibold underline">View cart</Link>
        </p>
      )}
    </form>
  );
}
