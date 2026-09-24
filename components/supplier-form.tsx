"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSupplier } from "@/lib/actions";
import type { Supplier } from "@/lib/types";
import { Button, Field, FormError, TextArea, TextInput } from "@/components/ui";

export function SupplierForm({ initial, onDone }: { initial?: Supplier | null; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await saveSupplier(initial?.id ?? null, {
      name: String(form.get("name") || ""),
      contact: String(form.get("contact") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      address: String(form.get("address") || ""),
      notes: String(form.get("notes") || ""),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FormError message={error} />
      <Field label="Name">
        <TextInput name="name" required defaultValue={initial?.name} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact person">
          <TextInput name="contact" defaultValue={initial?.contact} />
        </Field>
        <Field label="Phone">
          <TextInput name="phone" type="tel" defaultValue={initial?.phone} />
        </Field>
        <Field label="Email">
          <TextInput name="email" type="email" defaultValue={initial?.email} />
        </Field>
        <Field label="Address">
          <TextInput name="address" defaultValue={initial?.address} />
        </Field>
      </div>
      <Field label="Notes">
        <TextArea name="notes" defaultValue={initial?.notes} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial ? "Save supplier" : "Add supplier"}</Button>
      </div>
    </form>
  );
}
