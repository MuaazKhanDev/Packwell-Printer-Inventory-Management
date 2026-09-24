"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-6 py-12">
      <h1 className="font-serif text-3xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The inventory file could not be read. If you edited data/inventory.json, check that it is still valid JSON.</p>
      <button type="button" className="mt-4 rounded-lg bg-press px-3 py-2 text-sm font-semibold text-white" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
