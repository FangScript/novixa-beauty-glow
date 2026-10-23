"use client";
export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-shell py-16">
      <h1 className="font-display text-3xl">We could not load this page</h1>
      <p className="my-4">Your connection or our service may be temporarily unavailable.</p>
      <button onClick={reset} className="border px-6 py-3">
        Try again
      </button>
    </main>
  );
}
