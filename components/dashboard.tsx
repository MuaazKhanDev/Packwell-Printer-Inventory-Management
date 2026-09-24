"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dismissNotice, restoreSample } from "@/lib/actions";
import { categoryColor } from "@/lib/constants";
import { formatDate, formatMoney, formatQty, todayISO } from "@/lib/format";
import { statusOf } from "@/lib/inventory";
import type { Database } from "@/lib/types";
import { Button, PageHeader, StatusPill } from "@/components/ui";

export function Dashboard({ db }: { db: Database }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const month = todayISO().slice(0, 7);
  const stockValue = db.items.reduce((sum, item) => sum + item.quantityOnHand * item.averageCost, 0);
  const monthPurchases = db.purchases.filter((purchase) => purchase.date.startsWith(month));
  const monthSpend = monthPurchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.unitPrice, 0);
  const monthUsage = db.movements.filter((movement) => movement.direction === "out" && movement.date.startsWith(month));
  const alerts = db.items
    .filter((item) => statusOf(item) !== "ok")
    .sort((a, b) => a.quantityOnHand / Math.max(a.reorderLevel, 1) - b.quantityOnHand / Math.max(b.reorderLevel, 1));
  const out = db.items.filter((item) => statusOf(item) === "out").length;
  const low = db.items.filter((item) => statusOf(item) === "low").length;
  const ok = db.items.length - out - low;

  const categories = db.items.reduce<Record<string, { total: number; count: number }>>((acc, item) => {
    const bucket = acc[item.category] ?? { total: 0, count: 0 };
    bucket.total += item.quantityOnHand * item.averageCost;
    bucket.count += 1;
    acc[item.category] = bucket;
    return acc;
  }, {});
  const categoryRows = Object.entries(categories)
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.total - a.total);
  const maxCategory = categoryRows[0]?.total || 1;

  const recent = [...db.purchases].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const itemById = new Map(db.items.map((item) => [item.id, item]));
  const supplierById = new Map(db.suppliers.map((supplier) => [supplier.id, supplier]));

  if (db.items.length === 0) {
    return (
      <div>
        <PageHeader title="Inventory overview" lede="Stock, purchases, and cost for Packwell Printers." />
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
          <h2 className="font-serif text-3xl">The catalogue is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Add the first material, or load a sample print-shop stock list to see how purchases, cost, and low-stock alerts work.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/inventory" className="inline-flex rounded-lg bg-press px-3 py-2 text-sm font-semibold text-white">Add an item</Link>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await restoreSample();
                setPending(false);
                router.refresh();
              }}
            >
              {pending ? "Loading…" : "Load sample data"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Inventory overview" lede="What is on hand, what it cost, and what needs reordering." />
      {db.meta.usingSample && !db.meta.noticeDismissed ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2d3b0] bg-[#f8f1df] px-4 py-3 text-sm">
          <p className="max-w-3xl">Sample stock for a working print shop is loaded, so you can follow purchases, average cost, and low-stock alerts. Clear it from the sidebar when you are ready to enter Packwell&apos;s own materials.</p>
          <Button
            variant="secondary"
            onClick={async () => {
              await dismissNotice();
              router.refresh();
            }}
          >
            Dismiss
          </Button>
        </div>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Catalogue" value={String(db.items.length)} hint={`${db.suppliers.length} suppliers`} href="/inventory" />
        <Kpi label="Stock value" value={formatMoney(stockValue)} hint="At weighted average cost" href="/inventory" />
        <Kpi label="Purchases this month" value={formatMoney(monthSpend)} hint={`${monthPurchases.length} receipts`} href="/purchases" />
        <Kpi label="Needs reorder" value={String(alerts.length)} hint={`${out} out · ${low} low · ${formatQty(monthUsage.reduce((sum, movement) => sum + movement.quantity, 0))} used this month`} href="/inventory?status=low" />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-line bg-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-serif text-2xl">Reorder list</h2>
            <Link href="/inventory?status=low" className="text-sm font-semibold text-press">Open inventory</Link>
          </div>
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted">Every item is above its reorder level.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                    <th className="px-4 py-2 font-semibold">Item</th>
                    <th className="px-3 py-2 text-right font-semibold">On hand</th>
                    <th className="px-3 py-2 text-right font-semibold">Reorder</th>
                    <th className="px-3 py-2 text-right font-semibold">Gap</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((item) => (
                    <tr key={item.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link href={`/inventory?item=${item.id}`} className="font-semibold hover:text-press">{item.name}</Link>
                        <div className="text-xs text-muted">{item.sku}</div>
                      </td>
                      <td className="nums px-3 py-3 text-right">{formatQty(item.quantityOnHand)}</td>
                      <td className="nums px-3 py-3 text-right">{formatQty(item.reorderLevel)}</td>
                      <td className="nums px-3 py-3 text-right">{formatQty(Math.max(0, item.reorderLevel - item.quantityOnHand))}</td>
                      <td className="px-4 py-3"><StatusPill status={statusOf(item)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 lg:col-span-2">
          <h2 className="font-serif text-2xl">Value by category</h2>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#efeae1]">
            {db.items.length > 0 ? (
              <>
                <div className="bg-ok" style={{ width: `${(ok / db.items.length) * 100}%` }} />
                <div className="bg-low" style={{ width: `${(low / db.items.length) * 100}%` }} />
                <div className="bg-danger" style={{ width: `${(out / db.items.length) * 100}%` }} />
              </>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted">{ok} in stock · {low} low · {out} out</p>
          <ul className="mt-4 space-y-3">
            {categoryRows.map((row) => (
              <li key={row.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{row.name}</span>
                  <span className="nums text-muted">{formatMoney(row.total)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#efeae1]">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, (row.total / maxCategory) * 100)}%`, background: categoryColor(row.name) }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-serif text-2xl">Recent purchases</h2>
          <Link href="/purchases" className="text-sm font-semibold text-press">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Item</th>
                <th className="px-3 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Unit price</th>
                <th className="px-4 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((purchase) => {
                const item = itemById.get(purchase.itemId);
                return (
                  <tr key={purchase.id} className="border-t border-line">
                    <td className="px-4 py-3">{formatDate(purchase.date)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/inventory?item=${purchase.itemId}`} className="font-semibold hover:text-press">{item?.name ?? "Removed item"}</Link>
                      <div className="text-xs text-muted">{purchase.invoiceNo || "No invoice"}</div>
                    </td>
                    <td className="px-3 py-3">{supplierById.get(purchase.supplierId)?.name ?? "—"}</td>
                    <td className="nums px-3 py-3 text-right">{formatQty(purchase.quantity)} {item?.unit}</td>
                    <td className="nums px-3 py-3 text-right">{formatMoney(purchase.unitPrice)}</td>
                    <td className="nums px-4 py-3 text-right">{formatMoney(purchase.quantity * purchase.unitPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint, href }: { label: string; value: string; hint: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-card px-4 py-4 transition hover:border-press/40">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="nums mt-2 font-serif text-3xl tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </Link>
  );
}
