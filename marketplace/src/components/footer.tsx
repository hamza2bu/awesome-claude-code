import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 text-sm text-slate-600 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-slate-900">Market<span className="text-accent-500">ly</span></p>
          <p className="mt-2">Independent shops, one checkout.</p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Shop</p>
          <Link className="block hover:text-brand-600" href="/products">All products</Link>
          <Link className="block hover:text-brand-600" href="/shops">Browse shops</Link>
          <Link className="block hover:text-brand-600" href="/account/orders">Track an order</Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">Sell</p>
          <Link className="block hover:text-brand-600" href="/sell">Open a shop</Link>
          <Link className="block hover:text-brand-600" href="/vendor">Seller dashboard</Link>
        </div>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Marketly. Payments are split securely between sellers and the platform.
      </p>
    </footer>
  );
}
