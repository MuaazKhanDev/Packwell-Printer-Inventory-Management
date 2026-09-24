"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { Button, FormError, TextInput } from "@/components/ui";

export function LoginForm({ passwordConfigured }: { passwordConfigured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    setPending(true);
    setError(null);
    const result = await login(password);
    setPending(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-press font-serif text-xl text-white">P</div>
          <div>
            <p className="font-serif text-2xl leading-none">Packwell</p>
            <p className="mt-1 text-[11px] tracking-[0.16em] text-muted uppercase">Printers</p>
          </div>
        </div>
        <h1 className="mt-6 font-serif text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Use the shared office password. The same stock list opens on every Packwell computer.</p>
        <FormError message={error} />
        {!passwordConfigured ? (
          <p className="mt-4 rounded-lg bg-[#f8efd8] px-3 py-2 text-sm text-low">
            Set PACKWELL_PASSWORD in the Vercel project settings, then redeploy.
          </p>
        ) : null}
        <label className="mt-4 block text-sm font-medium">
          Password
          <TextInput className="mt-1.5" name="password" type="password" autoFocus required disabled={!passwordConfigured} />
        </label>
        <Button className="mt-4 w-full" type="submit" disabled={pending || !passwordConfigured}>
          {pending ? "Signing in…" : "Enter inventory"}
        </Button>
      </form>
    </main>
  );
}
