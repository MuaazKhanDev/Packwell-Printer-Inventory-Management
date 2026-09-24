"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteItem, deleteMovement, deletePurchase } from "@/lib/actions";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { ledgerFor, statusOf, type StockStatus } from "@/lib/inventory";
import type { Database, Item, Movement, Purchase } from "@/lib/types";
import { ItemForm } from "@/components/item-form";
import { MovementForm } from "@/components/movement-form";
import { PurchaseForm } from "@/components/purchase-form";
import { Button, Modal, PageHeader, StatusPill, cx, useLockBody } from "@/components/ui";
import { CATEGORY_NAMES } from "@/lib/constants";

type SortKey = "name" | "category" | "quantityOnHand" | "value" | "lastPurchaseDate";

export function InventoryClient({
  db,
  initialStatus,
  initialItemId,
  nextSku,
}: {
  db: Database;
  initialStatus: "all" | StockStatus;
  initialItemId: string | null;
  nextSku: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState(initialStatus);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId);
  const [itemOpen, setItemOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "item" | "purchase" | "movement"; id: string; label: string }>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const supplierById = useMemo(() => new Map(db.suppliers.map((supplier) => [supplier.id, supplier])), [db.suppliers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = db.items.filter((item) => {
      const matchesQuery = !q || [item.name, item.sku, item.category, item.location].join(" ").toLowerCase().includes(q);
      const matchesCategory = category === "all" || item.category === category;
      const matchesStatus = status === "all" || statusOf(item) === status || (status === "low" && statusOf(item) === "out");
      return matchesQuery && matchesCategory && matchesStatus;
    });
    const direction = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const valueA = sortKey === "value" ? a.quantityOnHand * a.averageCost : sortKey === "lastPurchaseDate" ? a.lastPurchaseDate ?? "" : a[sortKey];
      const valueB = sortKey === "value" ? b.quantityOnHand * b.averageCost : sortKey === "lastPurchaseDate" ? b.lastPurchaseDate ?? "" : b[sortKey];
      if (typeof valueA === "number" && typeof valueB === "number") return (valueA - valueB) * direction;
      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  }, [db.items, query, category, status, sortKey, sortDir]);

  const selected = db.items.find((item) => item.id === selectedId) ?? null;
  const filteredValue = rows.reduce((sum, item) => sum + item.quantityOnHand * item.averageCost, 0);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "category" ? "asc" : "desc");
    }
  }

  function exportView() {
    downloadCsv("packwell-inventory.csv", [
      ["SKU", "Name", "Category", "Unit", "Location", "On hand", "Reorder level", "Average cost", "Last purchase price", "Last purchase date", "Stock value", "Supplier", "Status"],
      ...rows.map((item) => [
        item.sku,
        item.name,
        item.category,
        item.unit,
        item.location,
        String(item.quantityOnHand),
        String(item.reorderLevel),
        String(item.averageCost),
        String(item.lastPurchasePrice),
        item.lastPurchaseDate ?? "",
        String(Math.round(item.quantityOnHand * item.averageCost)),
        item.supplierId ? supplierById.get(item.supplierId)?.name ?? "" : "",
        statusOf(item),
      ]),
    ]);
  }

  async function runConfirm() {
    if (!confirm) return;
    setPending(true);
    setActionError(null);
    const result =
      confirm.kind === "item"
        ? await deleteItem(confirm.id)
        : confirm.kind === "purchase"
          ? await deletePurchase(confirm.id)
          : await deleteMovement(confirm.id);
    setPending(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    if (confirm.kind === "item") setSelectedId(null);
    setConfirm(null);
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Inventory" lede="Every material, how much is left, and what it last cost.">
        <Button variant="secondary" onClick={exportView}>Export CSV</Button>
        <Button onClick={() => { setEditing(null); setItemOpen(true); }}>Add item</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, location" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:w-64" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {CATEGORY_NAMES.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as "all" | StockStatus)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="all">All stock levels</option>
          <option value="ok">In stock</option>
          <option value="low">Low or out</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <caption className="sr-only">Inventory items</caption>
            <thead>
              <tr className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                <SortHeader label="Item" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                <SortHeader label="Category" active={sortKey === "category"} dir={sortDir} onClick={() => toggleSort("category")} />
                <th className="px-3 py-3 font-semibold">Location</th>
                <SortHeader label="On hand" align="right" active={sortKey === "quantityOnHand"} dir={sortDir} onClick={() => toggleSort("quantityOnHand")} />
                <th className="px-3 py-3 text-right font-semibold">Reorder</th>
                <th className="px-3 py-3 text-right font-semibold">Avg cost</th>
                <SortHeader label="Stock value" align="right" active={sortKey === "value"} dir={sortDir} onClick={() => toggleSort("value")} />
                <SortHeader label="Last bought" active={sortKey === "lastPurchaseDate"} dir={sortDir} onClick={() => toggleSort("lastPurchaseDate")} />
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="cursor-pointer border-t border-line hover:bg-[#f7f3ea]" onClick={() => setSelectedId(item.id)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted">{item.sku}</div>
                  </td>
                  <td className="px-3 py-3">{item.category}</td>
                  <td className="px-3 py-3">{item.location || "—"}</td>
                  <td className="nums px-3 py-3 text-right">{formatQty(item.quantityOnHand)} {item.unit}</td>
                  <td className="nums px-3 py-3 text-right">{formatQty(item.reorderLevel)}</td>
                  <td className="nums px-3 py-3 text-right">{formatMoney(item.averageCost)}</td>
                  <td className="nums px-3 py-3 text-right">{formatMoney(item.quantityOnHand * item.averageCost)}</td>
                  <td className="px-3 py-3">
                    <div>{formatDate(item.lastPurchaseDate)}</div>
                    <div className="text-xs text-muted">{item.lastPurchasePrice ? formatMoney(item.lastPurchasePrice) : ""}</div>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={statusOf(item)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">{db.items.length === 0 ? "No items yet. Add the first material to start the catalogue." : "Nothing matches those filters."}</p>
        ) : (
          <div className="flex justify-between border-t border-line px-4 py-3 text-sm text-muted">
            <span>{rows.length} of {db.items.length} items</span>
            <span className="nums">View value {formatMoney(filteredValue)}</span>
          </div>
        )}
      </div>
      {selected ? (
        <ItemDrawer
          db={db}
          item={selected}
          supplierName={selected.supplierId ? supplierById.get(selected.supplierId)?.name ?? "—" : "—"}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setEditing(selected); setItemOpen(true); }}
          onPurchase={() => { setEditingPurchase(null); setPurchaseOpen(true); }}
          onUse={() => { setEditingMovement(null); setMovementOpen(true); }}
          onEditPurchase={(purchase) => { setEditingPurchase(purchase); setPurchaseOpen(true); }}
          onEditMovement={(movement) => { setEditingMovement(movement); setMovementOpen(true); }}
          onDelete={() => setConfirm({ kind: "item", id: selected.id, label: selected.name })}
          onDeletePurchase={(purchase) => setConfirm({ kind: "purchase", id: purchase.id, label: purchase.invoiceNo || "this purchase" })}
          onDeleteMovement={(movement) => setConfirm({ kind: "movement", id: movement.id, label: movement.reason })}
        />
      ) : null}
      {itemOpen ? (
        <Modal title={editing ? "Edit item" : "Add item"} onClose={() => setItemOpen(false)} wide>
          <ItemForm suppliers={db.suppliers} nextSku={nextSku} initial={editing} onDone={() => setItemOpen(false)} />
        </Modal>
      ) : null}
      {purchaseOpen ? (
        <Modal title={editingPurchase ? "Edit purchase" : "Record purchase"} onClose={() => setPurchaseOpen(false)}>
          <PurchaseForm items={db.items} suppliers={db.suppliers} initial={editingPurchase} presetItemId={selected?.id} onDone={() => setPurchaseOpen(false)} />
        </Modal>
      ) : null}
      {movementOpen ? (
        <Modal title={editingMovement ? "Edit stock movement" : "Record stock movement"} onClose={() => setMovementOpen(false)}>
          <MovementForm items={db.items} initial={editingMovement} presetItemId={selected?.id} onDone={() => setMovementOpen(false)} />
        </Modal>
      ) : null}
      {confirm ? (
        <Modal title={`Delete ${confirm.label}?`} onClose={() => setConfirm(null)}>
          <p className="text-sm text-muted">
            {confirm.kind === "item"
              ? "The item and its purchases and stock movements will be removed."
              : "The stock balance will be recalculated from the remaining history."}
          </p>
          {actionError ? <p className="mt-3 text-sm text-danger">{actionError}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" disabled={pending} onClick={runConfirm}>{pending ? "Deleting…" : "Delete"}</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function SortHeader({ label, onClick, active, dir, align = "left" }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc"; align?: "left" | "right" }) {
  return (
    <th className={cx("px-3 py-3 font-semibold", align === "right" && "text-right", label === "Item" && "px-4")}>
      <button type="button" onClick={onClick} className={cx("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        <span className="text-[10px]">{active ? (dir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );
}

function ItemDrawer({
  db,
  item,
  supplierName,
  onClose,
  onEdit,
  onPurchase,
  onUse,
  onDelete,
  onEditPurchase,
  onEditMovement,
  onDeletePurchase,
  onDeleteMovement,
}: {
  db: Database;
  item: Item;
  supplierName: string;
  onClose: () => void;
  onEdit: () => void;
  onPurchase: () => void;
  onUse: () => void;
  onDelete: () => void;
  onEditPurchase: (purchase: Purchase) => void;
  onEditMovement: (movement: Movement) => void;
  onDeletePurchase: (purchase: Purchase) => void;
  onDeleteMovement: (movement: Movement) => void;
}) {
  useLockBody();
  const ledger = ledgerFor(db, item.id);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button className="absolute inset-0 bg-[#1c1915]/30" aria-label="Close item" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl">
        <div className="border-b border-line px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.14em] text-muted uppercase">{item.sku}</p>
              <h2 className="mt-1 font-serif text-3xl leading-tight">{item.name}</h2>
              <div className="mt-2"><StatusPill status={statusOf(item)} /></div>
            </div>
            <button type="button" className="text-xl text-muted" onClick={onClose} aria-label="Close">×</button>
          </div>
          <p className="mt-3 text-sm text-muted">{item.description || "No description yet."}</p>
          <p className="mt-2 text-sm">{item.location || "No location"} · {supplierName}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="On hand" value={`${formatQty(item.quantityOnHand)} ${item.unit}`} />
            <Stat label="Stock value" value={formatMoney(item.quantityOnHand * item.averageCost)} />
            <Stat label="Average cost" value={formatMoney(item.averageCost)} />
            <Stat label="Last price" value={item.lastPurchasePrice ? formatMoney(item.lastPurchasePrice) : "—"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onPurchase}>Record purchase</Button>
            <Button variant="secondary" onClick={onUse}>Record use</Button>
            <Button variant="ghost" onClick={onEdit}>Edit</Button>
            <Button variant="ghostDanger" onClick={onDelete}>Delete</Button>
          </div>
        </div>
        <div className="px-5 py-4">
          <h3 className="font-serif text-xl">History</h3>
          <p className="mt-1 text-xs text-muted">Purchases raise stock at the invoice price. Usage keeps the average cost and lowers the balance.</p>
          <ol className="mt-4 space-y-3">
            {ledger.length === 0 ? <li className="text-sm text-muted">No purchases or movements yet.</li> : null}
            {ledger.map((row) => (
              <li key={row.id} className="rounded-xl border border-line px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-xs text-muted">{formatDate(row.date)}{row.party ? ` · ${row.party}` : ""}{row.note ? ` · ${row.note}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={cx("nums text-sm font-semibold", row.direction === "in" ? "text-ok" : "text-danger")}>
                      {row.direction === "in" ? "+" : "−"}{formatQty(row.quantity)}
                    </p>
                    <p className="nums text-xs text-muted">Bal {formatQty(row.balance)}</p>
                  </div>
                </div>
                {row.unitPrice !== null ? <p className="nums mt-1 text-xs text-muted">{formatMoney(row.unitPrice)} each · {formatMoney(row.unitPrice * row.quantity)}</p> : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-press"
                    onClick={() => {
                      if (row.source === "purchase") {
                        const purchase = db.purchases.find((entry) => entry.id === row.id);
                        if (purchase) onEditPurchase(purchase);
                      } else {
                        const movement = db.movements.find((entry) => entry.id === row.id);
                        if (movement) onEditMovement(movement);
                      }
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-danger"
                    onClick={() => {
                      if (row.source === "purchase") {
                        const purchase = db.purchases.find((entry) => entry.id === row.id);
                        if (purchase) onDeletePurchase(purchase);
                      } else {
                        const movement = db.movements.find((entry) => entry.id === row.id);
                        if (movement) onDeleteMovement(movement);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f6f1e8] px-3 py-2">
      <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="nums mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
