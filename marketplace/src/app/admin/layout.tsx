import { DashboardNav } from "@/components/dashboard-nav";
import { requireRole } from "@/server/guards";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return (
    <div className="container-page py-6">
      <p className="mb-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">Marketplace admin</p>
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <aside><DashboardNav items={NAV} root="/admin" /></aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
