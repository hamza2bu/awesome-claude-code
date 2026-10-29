import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import { requireShop } from "@/server/guards";

const NAV = [
  { href: "/vendor", label: "Overview" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/settings", label: "Shop & payouts" },
];

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const { shop } = await requireShop();
  return (
    <div className="container-page py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Seller dashboard</p>
          <p className="text-xl font-bold">{shop.name}</p>
        </div>
        {shop.status === "ACTIVE" && <Link href={`/shops/${shop.slug}`} className="text-sm font-semibold text-brand-600">View storefront →</Link>}
      </div>

      {shop.status === "PENDING" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your shop is awaiting approval. You can add products now — they&apos;ll go live once an admin approves your shop.
        </p>
      )}
      {shop.status === "SUSPENDED" && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Your shop is suspended and hidden from customers. Contact support for details.
        </p>
      )}
      {shop.status === "ACTIVE" && !shop.payoutsEnabled && (
        <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Connect payouts to receive your earnings. <Link href="/vendor/settings" className="font-semibold underline">Set up payouts</Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <aside><DashboardNav items={NAV} root="/vendor" /></aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
