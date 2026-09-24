"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_NAMES } from "@/lib/constants";
import { savePurchase } from "@/lib/actions";
import { formatMoney, formatQty, todayISO } from "@/lib/format";
import type { Item, Purchase, Supplier } from "@/lib/types";
import { Button, Field, FormError, SelectInput, TextArea, TextInput } from "@/components/ui";

export function PurchaseForm({
  items,
  suppliers,
  initial,
  presetItemId,
  onDone,
}: {
  items: Item[];
  suppliers: Supplier[];
  initial?: Purchase | null;
  presetItemId?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const startingItemId = initial?.itemId ?? presetItemId ?? items[0]?.id ?? "";
  const startingItem = items.find((entry) => entry.id === startingItemId);
  const [itemId, setItemId] = useState(startingItemId);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? startingItem?.supplierId ?? "");
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : "");
  const [unitPrice, setUnitPrice] = useState(
    initial ? String(initial.unitPrice) : startingItem?.lastPurchasePrice ? String(startingItem.lastPurchasePrice) : "",
  );

  const item = items.find((entry) => entry.id === itemId);
  const lineTotal = Number(quantity) * Number(unitPrice);

  const grouped = useMemo(
    () =>
      CATEGORY_NAMES.map((category) => ({
        category,
        items: items.filter((entry) => entry.category === category).sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  function chooseItem(nextId: string) {
    setItemId(nextId);
    if (!initial) {
      const next = items.find((entry) => entry.id === nextId);
      if (next?.supplierId) setSupplierId(next.supplierId);
      if (next && !unitPrice) setUnitPrice(next.lastPurchasePrice ? String(next.lastPurchasePrice) : "");
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await savePurchase(initial?.id ?? null, {
      itemId,
      supplierId,
      date: String(form.get("date") || ""),
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      invoiceNo: String(form.get("invoiceNo") || ""),
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

  if (items.length === 0) {
    return <p className="text-sm text-muted">Add an inventory item before recording a purchase.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FormError message={error} />
      <Field label="Item" hint={item ? `${formatQty(item.quantityOnHand)} ${item.unit} on hand · last price ${item.lastPurchasePrice ? formatMoney(item.lastPurchasePrice) : "—"}` : undefined}>
        <SelectInput value={itemId} onChange={(event) => chooseItem(event.target.value)} required>
          {grouped.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name} ({entry.sku})</option>
              ))}
            </optgroup>
          ))}
        </SelectInput>
      </Field>
      <Field label="Supplier">
        <SelectInput value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
          <option value="" disabled>Choose a supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
          ))}
        </SelectInput>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <TextInput name="date" type="date" required max={todayISO()} defaultValue={initial?.date ?? todayISO()} />
        </Field>
        <Field label="Invoice">
          <TextInput name="invoiceNo" defaultValue={initial?.invoiceNo} placeholder="INV-1042" />
        </Field>
        <Field label={item ? `Quantity (${item.unit})` : "Quantity"}>
          <TextInput value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="0" step="any" required />
        </Field>
        <Field label="Unit price (Rs)">
          <TextInput value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} type="number" min="0" step="any" required />
        </Field>
      </div>
      {Number.isFinite(lineTotal) && Number(quantity) > 0 ? (
        <p className="text-sm font-medium">Line total {formatMoney(lineTotal)}</p>
      ) : null}
      <Field label="Notes">
        <TextArea name="notes" defaultValue={initial?.notes} placeholder="Optional" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending || suppliers.length === 0}>{pending ? "Saving…" : initial ? "Save purchase" : "Record purchase"}</Button>
      </div>
      {suppliers.length === 0 ? <p className="text-xs text-danger">Add a supplier before recording a purchase.</p> : null}
    </form>
  );
}
