"use client";

import { setCartQuantity } from "@/server/actions/cart";

export function QuantitySelect({ productId, quantity, max }: { productId: string; quantity: number; max: number }) {
  const options = Math.max(1, Math.min(max, 20), quantity);
  return (
    <form action={setCartQuantity}>
      <input type="hidden" name="productId" value={productId} />
      <label className="sr-only" htmlFor={`qty-${productId}`}>Quantity</label>
      <select
        id={`qty-${productId}`}
        name="quantity"
        defaultValue={quantity}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input w-20 py-1.5"
      >
        <option value={0}>Remove</option>
        {Array.from({ length: options }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <noscript><button className="btn-secondary mt-1 px-2 py-1 text-xs">Update</button></noscript>
    </form>
  );
}
