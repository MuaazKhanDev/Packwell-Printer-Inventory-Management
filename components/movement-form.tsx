"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_NAMES, REASONS } from "@/lib/constants";
import { saveMovement } from "@/lib/actions";
import { formatQty, todayISO } from "@/lib/format";
import type { Item, Movement } from "@/lib/types";
import { Button, Field, FormError, SelectInput, TextArea, TextInput } from "@/components/ui";

export function MovementForm({
  items,
  initial,
  presetItemId,
  onDone,
}: {
  items: Item[];
  initial?: Movement | null;
  presetItemId?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [itemId, setItemId] = useState(initial?.itemId ?? presetItemId ?? items[0]?.id ?? "");
  const [direction, setDirection] = useState<"in" | "out">(initial?.direction ?? "out");
  const item = items.find((entry) => entry.id === itemId);

  const grouped = useMemo(
    () =>
      CATEGORY_NAMES.map((category) => ({
        category,
        items: items.filter((entry) => entry.category === category).sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await saveMovement(initial?.id ?? null, {
      itemId,
      date: String(form.get("date") || ""),
      direction,
      quantity: Number(form.get("quantity") || 0),
      reason: String(form.get("reason") || ""),
      reference: String(form.get("reference") || ""),
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
      <Field label="Item" hint={item ? `${formatQty(item.quantityOnHand)} ${item.unit} on hand` : undefined}>
        <SelectInput value={itemId} onChange={(event) => setItemId(event.target.value)} required>
          {grouped.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </optgroup>
          ))}
        </SelectInput>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Direction</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="direction" checked={direction === "out"} onChange={() => setDirection("out")} />
            Removed from stock
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="direction" checked={direction === "in"} onChange={() => setDirection("in")} />
            Added back
          </label>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <TextInput name="date" type="date" required max={todayISO()} defaultValue={initial?.date ?? todayISO()} />
        </Field>
        <Field label={item ? `Quantity (${item.unit})` : "Quantity"}>
          <TextInput name="quantity" type="number" min="0" step="any" required defaultValue={initial?.quantity} />
        </Field>
        <Field label="Reason">
          <SelectInput name="reason" defaultValue={initial?.reason ?? "Production"}>
            {REASONS.map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Job or reference">
          <TextInput name="reference" defaultValue={initial?.reference} placeholder="PW-180" />
        </Field>
      </div>
      <Field label="Notes">
        <TextArea name="notes" defaultValue={initial?.notes} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial ? "Save movement" : "Record movement"}</Button>
      </div>
    </form>
  );
}
