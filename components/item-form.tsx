"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_NAMES, LOCATIONS, UNITS } from "@/lib/constants";
import { saveItem } from "@/lib/actions";
import { todayISO } from "@/lib/format";
import type { Item, Supplier } from "@/lib/types";
import { Button, Field, FormError, SelectInput, TextArea, TextInput } from "@/components/ui";

export function ItemForm({
  suppliers,
  nextSku,
  initial,
  onDone,
}: {
  suppliers: Supplier[];
  nextSku: string;
  initial?: Item | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [withOpening, setWithOpening] = useState(!initial);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? suppliers[0]?.id ?? "");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const openingQty = Number(form.get("openingQty") || 0);
    const result = await saveItem(initial?.id ?? null, {
      name: String(form.get("name") || ""),
      sku: String(form.get("sku") || ""),
      category: String(form.get("category") || ""),
      unit: String(form.get("unit") || ""),
      location: String(form.get("location") || ""),
      reorderLevel: Number(form.get("reorderLevel") || 0),
      supplierId,
      description: String(form.get("description") || ""),
      opening:
        !initial && withOpening
          ? {
              quantity: openingQty,
              unitPrice: Number(form.get("unitPrice") || 0),
              date: String(form.get("date") || ""),
              invoiceNo: String(form.get("invoiceNo") || ""),
              notes: String(form.get("openingNotes") || ""),
            }
          : null,
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
        <TextInput name="name" required defaultValue={initial?.name} placeholder="Art card 300gsm SRA3" autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU" hint={initial ? undefined : "Leave blank to assign the next PW number."}>
          <TextInput name="sku" defaultValue={initial?.sku ?? nextSku} placeholder={nextSku} />
        </Field>
        <Field label="Category">
          <SelectInput name="category" defaultValue={initial?.category ?? CATEGORY_NAMES[0]}>
            {CATEGORY_NAMES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Unit">
          <SelectInput name="unit" defaultValue={initial?.unit ?? UNITS[0]}>
            {UNITS.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Location">
          <TextInput name="location" list="locations" defaultValue={initial?.location} placeholder="Rack A1" />
          <datalist id="locations">
            {LOCATIONS.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </Field>
        <Field label="Reorder level" hint="You'll be warned when stock falls to this number.">
          <TextInput name="reorderLevel" type="number" min="0" step="any" required defaultValue={initial?.reorderLevel ?? 0} />
        </Field>
        <Field label="Preferred supplier">
          <SelectInput value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">No supplier yet</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label="Description">
        <TextArea name="description" defaultValue={initial?.description} placeholder="What this is used for on the press floor." />
      </Field>
      {initial ? (
        <p className="text-xs text-muted">Quantity, cost, and purchase dates stay on the purchase and usage records. Add a purchase or a stock movement to change the balance.</p>
      ) : (
        <div className="rounded-xl border border-line bg-[#faf7f1] p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={withOpening} onChange={(event) => setWithOpening(event.target.checked)} />
            Record the stock you already have as a purchase
          </label>
          {withOpening ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Quantity">
                <TextInput name="openingQty" type="number" min="0" step="any" defaultValue="0" required />
              </Field>
              <Field label="Unit price (Rs)">
                <TextInput name="unitPrice" type="number" min="0" step="any" defaultValue="0" required />
              </Field>
              <Field label="Purchase date">
                <TextInput name="date" type="date" max={todayISO()} defaultValue={todayISO()} required />
              </Field>
              <Field label="Invoice number">
                <TextInput name="invoiceNo" placeholder="INV-1042" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <TextInput name="openingNotes" placeholder="Optional" />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial ? "Save changes" : "Add item"}</Button>
      </div>
    </form>
  );
}
