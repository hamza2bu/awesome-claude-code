import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-lg py-16 text-center">
      <p className="text-5xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-slate-600">It may have been removed or is no longer available.</p>
      <Link href="/" className="btn-primary mt-6">Back to the marketplace</Link>
    </div>
  );
}
