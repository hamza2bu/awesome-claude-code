import Link from "next/link";
import { formatMoney } from "@/lib/money";

export function Price({ cents, compareAt, currency = "usd", className = "" }: {
  cents: number;
  compareAt?: number | null;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="font-bold text-slate-900">{formatMoney(cents, currency)}</span>
      {compareAt && compareAt > cents ? (
        <>
          <s className="text-sm text-slate-500">{formatMoney(compareAt, currency)}</s>
          <span className="text-xs font-semibold text-red-600">−{Math.round(((compareAt - cents) / compareAt) * 100)}%</span>
        </>
      ) : null}
    </span>
  );
}

export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "lg" }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className={`flex text-amber-400 ${size === "lg" ? "text-xl" : "text-sm"}`} aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= rounded ? "" : i - 0.5 === rounded ? "opacity-60" : "text-slate-300"}>★</span>
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-slate-500">({count})</span>}
    </span>
  );
}

const BADGE_TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-brand-50 text-brand-700 ring-brand-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

const STATUS_TONE: Record<string, keyof typeof BADGE_TONES> = {
  ACTIVE: "green", PAID: "blue", PROCESSING: "amber", SHIPPED: "blue", DELIVERED: "green", FULFILLED: "green",
  PARTIALLY_FULFILLED: "amber", PENDING: "amber", PENDING_PAYMENT: "amber", DRAFT: "slate", ARCHIVED: "slate",
  CANCELLED: "red", REFUNDED: "red", SUSPENDED: "red", TRANSFERRED: "green", FAILED: "red", NOT_DUE: "slate",
  REVERSED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = BADGE_TONES[STATUS_TONE[status] ?? "slate"];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${tone}`}>
      {status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function EmptyState({ title, body, href, cta }: { title: string; body?: string; href?: string; cta?: string }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      {body && <p className="mt-1 text-slate-600">{body}</p>}
      {href && cta && <Link href={href} className="btn-primary mt-6">{cta}</Link>}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

export function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.success) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>;
  return null;
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? <Link className="btn-secondary" href={makeHref(page - 1)}>← Prev</Link> : <span className="btn-secondary opacity-50">← Prev</span>}
      <span className="px-3 text-sm text-slate-600">Page {page} of {pages}</span>
      {page < pages ? <Link className="btn-secondary" href={makeHref(page + 1)}>Next →</Link> : <span className="btn-secondary opacity-50">Next →</span>}
    </nav>
  );
}
