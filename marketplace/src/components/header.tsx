import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cartCount } from "@/server/cart";
import { logout } from "@/server/actions/auth";
import { SearchBar } from "./search-bar";

export async function Header() {
  const [session, count, categories] = await Promise.all([
    auth(),
    cartCount(),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" }, take: 10 }),
  ]);
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 bg-brand-700 text-white shadow">
      <div className="container-page flex items-center gap-3 py-3">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight">
          Market<span className="text-accent-500">ly</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
          {user ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-2 hover:bg-white/10">
                <span className="hidden max-w-32 truncate sm:inline">{user.name ?? user.email}</span>
                <svg aria-hidden className="size-5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <span className="sr-only">Account menu</span>
              </summary>
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-lg">
                <Link className="block px-4 py-2 hover:bg-slate-50" href="/account/orders">My orders</Link>
                {user.role === "VENDOR" || user.role === "ADMIN" ? (
                  <Link className="block px-4 py-2 hover:bg-slate-50" href="/vendor">Seller dashboard</Link>
                ) : (
                  <Link className="block px-4 py-2 hover:bg-slate-50" href="/sell">Start selling</Link>
                )}
                {user.role === "ADMIN" && (
                  <Link className="block px-4 py-2 hover:bg-slate-50" href="/admin">Admin</Link>
                )}
                <form action={logout} className="border-t border-slate-100">
                  <button className="block w-full px-4 py-2 text-left hover:bg-slate-50">Sign out</button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/sell" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">Sell on Marketly</Link>
              <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-white/10">Sign in</Link>
            </>
          )}
          <Link href="/cart" className="relative flex items-center gap-1 rounded-lg px-2 py-2 hover:bg-white/10" aria-label={`Cart, ${count} items`}>
            <svg aria-hidden className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6" />
              <circle cx="10" cy="20.5" r="1.5" />
              <circle cx="18" cy="20.5" r="1.5" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-xs font-bold">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>

      <div className="container-page pb-3 md:hidden">
        <Suspense>
            <SearchBar />
          </Suspense>
      </div>

      <nav aria-label="Categories" className="bg-brand-600">
        <div className="container-page flex gap-1 overflow-x-auto py-1.5 text-sm whitespace-nowrap [scrollbar-width:none]">
          <Link href="/products" className="rounded-md px-3 py-1 hover:bg-white/10">All products</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="rounded-md px-3 py-1 hover:bg-white/10">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
