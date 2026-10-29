import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OrderSummary } from "@/components/order-summary";
import { QuantitySelect } from "@/components/quantity-select";
import { EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { removeFromCart } from "@/server/actions/cart";
import { cartSummary } from "@/server/cart-summary";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const { groups, totals, hasProblems, isEmpty, currency } = await cartSummary();

  if (isEmpty) {
    return (
      <div className="container-page py-8">
        <EmptyState title="Your cart is empty" body="Find something you love from our sellers." href="/products" cta="Browse products" />
      </div>
    );
  }

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-2xl font-bold">Shopping cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {groups.map(({ shop, lines, shippingCents }) => (
            <section key={shop.id} className="card overflow-hidden">
              <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
                <Link href={`/shops/${shop.slug}`} className="font-semibold hover:text-brand-600">{shop.name}</Link>
                <span className="text-slate-500">Shipping: {shippingCents === 0 ? "Free" : formatMoney(shippingCents, currency)}</span>
              </header>
              <ul className="divide-y divide-slate-100">
                {lines.map(({ product, quantity, problem }) => (
                  <li key={product.id} className="flex gap-3 p-4">
                    <Link href={`/products/${product.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:size-24">
                      {product.images[0] && <Image src={product.images[0].url} alt="" fill sizes="96px" className="object-cover" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium hover:text-brand-600">{product.title}</Link>
                        <p className="text-sm text-slate-500">{formatMoney(product.priceCents, product.currency)} each</p>
                        {problem && <p className="mt-1 text-sm font-medium text-red-600">{problem}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <QuantitySelect productId={product.id} quantity={quantity} max={product.stock} />
                        <p className="font-semibold">{formatMoney(product.priceCents * quantity, product.currency)}</p>
                        <form action={removeFromCart}>
                          <input type="hidden" name="productId" value={product.id} />
                          <button className="text-sm text-slate-500 underline hover:text-red-600">Remove</button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <OrderSummary {...totals} currency={currency}>
            {hasProblems && <p className="text-sm text-red-600">Fix the highlighted items to continue.</p>}
            {hasProblems ? (
              <span className="btn-accent w-full py-3 opacity-50">Proceed to checkout</span>
            ) : (
              <Link href="/checkout" className="btn-accent w-full py-3 text-base">Proceed to checkout</Link>
            )}
            <p className="text-center text-xs text-slate-500">One payment covers every shop in your cart.</p>
          </OrderSummary>
        </aside>
      </div>
    </div>
  );
}
