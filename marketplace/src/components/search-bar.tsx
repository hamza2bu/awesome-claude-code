"use client";

import { useSearchParams } from "next/navigation";

export function SearchBar() {
  const params = useSearchParams();
  return (
    <form action="/products" role="search" className="flex">
      <label htmlFor="q" className="sr-only">Search products</label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search products, brands and shops"
        className="w-full min-w-0 rounded-l-lg border-0 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-accent-500 focus:outline-none sm:text-sm"
      />
      <button className="rounded-r-lg bg-accent-500 px-4 text-white hover:bg-accent-600" aria-label="Search">
        <svg aria-hidden className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
