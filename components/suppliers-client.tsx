"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSupplier } from "@/lib/actions";
import { formatDate, formatMoney } from "@/lib/format";
import type { Database, Supplier } from "@/lib/types";
import { SupplierForm } from "@/components/supplier-form";
import { Button, Modal, PageHeader } from "@/components/ui";

export function SuppliersClient({ db }: { db: Database }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cards = db.suppliers
    .map((supplier) => {
      const purchases = db.purchases.filter((purchase) => purchase.supplierId === supplier.id);
      const spent = purchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.unitPrice, 0);
      const last = purchases.map((purchase) => purchase.date).sort().at(-1) ?? null;
      const items = db.items.filter((item) => item.supplierId === supplier.id).length;
      return { supplier, spent, last, items, receipts: purchases.length };
    })
    .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name));

  return (
    <div>
      <PageHeader title="Suppliers" lede="Who you buy from, and how much you have spent with them.">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>Add supplier</Button>
      </PageHeader>
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
          <h2 className="font-serif text-3xl">No suppliers yet</h2>
          <p className="mt-2 text-sm text-muted">Add a supplier before you record a purchase.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(({ supplier, spent, last, items, receipts }) => (
            <article key={supplier.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl">{supplier.name}</h2>
                  <p className="mt-1 text-sm text-muted">{supplier.contact || "No contact name"}</p>
                </div>
                <div className="text-right">
                  <p className="nums text-sm font-semibold">{formatMoney(spent)}</p>
                  <p className="text-xs text-muted">{receipts} receipts</p>
                </div>
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <div>{supplier.phone || "No phone"}</div>
                <div>{supplier.email || "No email"}</div>
                <div className="text-muted">{supplier.address || "No address"}</div>
              </dl>
              {supplier.notes ? <p className="mt-3 text-sm text-muted">{supplier.notes}</p> : null}
              <p className="mt-3 text-xs text-muted">{items} preferred items · last purchase {formatDate(last)}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => { setEditing(supplier); setOpen(true); }}>Edit</Button>
                <Button variant="ghostDanger" onClick={() => { setError(null); setDeleting(supplier); }}>Delete</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {open ? (
        <Modal title={editing ? "Edit supplier" : "Add supplier"} onClose={() => setOpen(false)}>
          <SupplierForm initial={editing} onDone={() => setOpen(false)} />
        </Modal>
      ) : null}
      {deleting ? (
        <Modal title={`Delete ${deleting.name}?`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted">You can delete a supplier only when no item or purchase still points at them.</p>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await deleteSupplier(deleting.id);
                setPending(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setDeleting(null);
                router.refresh();
              }}
            >
              {pending ? "Deleting…" : "Delete supplier"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
