"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600">Please try again. If the problem persists, contact support.</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
