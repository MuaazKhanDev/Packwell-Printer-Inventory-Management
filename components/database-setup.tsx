export function DatabaseSetup() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Packwell Printers</p>
      <h1 className="mt-2 font-serif text-4xl">Connect the shared stock list</h1>
      <p className="mt-3 text-sm text-muted">
        This site is online, but the stock is still waiting for a database. Add these two settings in the Vercel project, then redeploy. All three Packwell computers will then see the same items and prices.
      </p>
      <ol className="mt-6 space-y-3 text-sm">
        <li className="rounded-xl border border-line bg-card px-4 py-3">
          <span className="font-semibold">DATABASE_URL</span>
          <p className="mt-1 text-muted">From Supabase: Project Settings, Database, Connection string, URI. Use the pooler string. The free plan is enough.</p>
        </li>
        <li className="rounded-xl border border-line bg-card px-4 py-3">
          <span className="font-semibold">PACKWELL_PASSWORD</span>
          <p className="mt-1 text-muted">One password the office computers will use to sign in.</p>
        </li>
      </ol>
    </main>
  );
}
