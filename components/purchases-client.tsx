"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deletePurchase } from "@/lib/actions";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import type { Database, Purchase } from "@/lib/types";
import { PurchaseForm } from "@/components/purchase-form";
import { Button, Modal, PageHeader } from "@/components/ui";

export function PurchasesClient({ db }: { db: Database }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [supplierId, setSupplierId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState<Purchase | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemById = useMemo(() => new Map(db.items.map((item) => [item.id, item])), [db.items]);
  const supplierById = useMemo(() => new Map(db.suppliers.map((supplier) => [supplier.id, supplier])), [db.suppliers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...db.purchases]
      .filter((purchase) => {
        const item = itemById.get(purchase.itemId);
        const supplier = supplierById.get(purchase.supplierId);
        const haystack = [item?.name, item?.sku, supplier?.name, purchase.invoiceNo, purchase.notes].join(" ").toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (supplierId !== "all" && purchase.supplierId !== supplierId) return false;
        if (from && purchase.date < from) return false;
        if (to && purchase.date > to) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [db.purchases, query, supplierId, from, to, itemById, supplierById]);

  const total = rows.reduce((sum, purchase) => sum + purchase.quantity * purchase.unitPrice, 0);

  function exportView() {
    downloadCsv("packwell-purchases.csv", [
      ["Date", "Invoice", "SKU", "Item", "Supplier", "Quantity", "Unit", "Unit price", "Total", "Notes"],
      ...rows.map((purchase) => {
        const item = itemById.get(purchase.itemId);
        return [
          purchase.date,
          purchase.invoiceNo,
          item?.sku ?? "",
          item?.name ?? "",
          supplierById.get(purchase.supplierId)?.name ?? "",
          String(purchase.quantity),
          item?.unit ?? "",
          String(purchase.unitPrice),
          String(purchase.quantity * purchase.unitPrice),
          purchase.notes,
        ];
      }),
    ]);
  }

  return (
    <div>
      <PageHeader title="Purchases" lede="Every receipt: when it arrived, from whom, at what price, and in what quantity.">
        <Button variant="secondary" onClick={exportView}>Export CSV</Button>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>Record purchase</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, invoice, supplier" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:w-64" />
        <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="all">All suppliers</option>
          {db.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm" aria-label="From date" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm" aria-label="To date" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Item</th>
                <th className="px-3 py-3 font-semibold">Supplier</th>
                <th className="px-3 py-3 text-right font-semibold">Qty</th>
                <th className="px-3 py-3 text-right font-semibold">Unit price</th>
                <th className="px-3 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((purchase) => {
                const item = itemById.get(purchase.itemId);
                return (
                  <tr key={purchase.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div>{formatDate(purchase.date)}</div>
                      <div className="text-xs text-muted">{purchase.invoiceNo || "No invoice"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{item?.name ?? "Removed item"}</div>
                      <div className="text-xs text-muted">{purchase.notes}</div>
                    </td>
                    <td className="px-3 py-3">{supplierById.get(purchase.supplierId)?.name ?? "—"}</td>
                    <td className="nums px-3 py-3 text-right">{formatQty(purchase.quantity)} {item?.unit}</td>
                    <td className="nums px-3 py-3 text-right">{formatMoney(purchase.unitPrice)}</td>
                    <td className="nums px-3 py-3 text-right">{formatMoney(purchase.quantity * purchase.unitPrice)}</td>
                    <td className="px-4 py-3">
                      <button type="button" className="text-xs font-semibold text-press" onClick={() => { setEditing(purchase); setOpen(true); }}>Edit</button>
                      <button type="button" className="ml-3 text-xs font-semibold text-danger" onClick={() => setDeleting(purchase)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between border-t border-line px-4 py-3 text-sm text-muted">
          <span>{rows.length} receipts</span>
          <span className="nums">Total {formatMoney(total)}</span>
        </div>
      </div>
      {open ? (
        <Modal title={editing ? "Edit purchase" : "Record purchase"} onClose={() => setOpen(false)}>
          <PurchaseForm items={db.items} suppliers={db.suppliers} initial={editing} onDone={() => setOpen(false)} />
        </Modal>
      ) : null}
      {deleting ? (
        <Modal title="Delete this purchase?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted">Stock and average cost will be recalculated. If later usage depends on this receipt, the delete will be blocked.</p>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await deletePurchase(deleting.id);
                setPending(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setDeleting(null);
                router.refresh();
              }}
            >
              {pending ? "Deleting…" : "Delete purchase"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
