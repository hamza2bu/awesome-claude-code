"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav({ items, root }: { items: { href: string; label: string }[]; root: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === root ? pathname === root : pathname.startsWith(href));
  return (
    <nav aria-label="Dashboard" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
            isActive(item.href) ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-200/60"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
