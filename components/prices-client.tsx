"use client";

import { useMemo, useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { priceRows } from "@/lib/prices";
import type { Database } from "@/lib/types";
import { PageHeader, cx } from "@/components/ui";

export function PricesClient({ db }: { db: Database }) {
  const rows = useMemo(() => priceRows(db), [db]);
  const [selectedId, setSelectedId] = useState(rows[0]?.item.id ?? "");
  const [query, setQuery] = useState("");
  const selected = rows.find((row) => row.item.id === selectedId) ?? null;
  const visible = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    return !q || `${row.item.name} ${row.item.sku}`.toLowerCase().includes(q);
  });
  const higher = rows.filter((row) => (row.change ?? 0) > 0).length;
  const lower = rows.filter((row) => (row.change ?? 0) < 0).length;
  const same = rows.filter((row) => row.change === 0).length;

  function exportView() {
    downloadCsv("packwell-price-comparison.csv", [
      ["SKU", "Item", "Date", "Supplier", "Quantity", "Unit price", "Previous price", "Change", "Change %"],
      ...rows.flatMap((row) =>
        row.purchases.map((point) => [
          row.item.sku,
          row.item.name,
          point.purchase.date,
          row.supplierName,
          String(point.purchase.quantity),
          String(point.purchase.unitPrice),
          point.previousPrice === null ? "" : String(point.previousPrice),
          point.change === null ? "" : String(point.change),
          point.changePct === null ? "" : point.changePct.toFixed(1),
        ]),
      ),
    ]);
  }

  return (
    <div>
      <PageHeader title="Price comparison" lede="Each purchase beside the price paid the time before, so a rise or a drop is visible before the next order.">
        <button type="button" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold" onClick={exportView}>
          Export CSV
        </button>
      </PageHeader>
      <section className="grid gap-4 sm:grid-cols-3">
        <Summary label="Latest price is higher" value={String(higher)} hint="Than the previous receipt" />
        <Summary label="Latest price is lower" value={String(lower)} hint="Than the previous receipt" />
        <Summary label="Unchanged" value={String(same)} hint="Same unit price as last time" />
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-line bg-card lg:col-span-3">
          <div className="border-b border-line px-4 py-3">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item or SKU" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-[0.12em] text-muted uppercase">
                  <th className="px-4 py-2 font-semibold">Item</th>
                  <th className="px-3 py-2 text-right font-semibold">Previous</th>
                  <th className="px-3 py-2 text-right font-semibold">Latest</th>
                  <th className="px-4 py-2 text-right font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.item.id}
                    className={cx("cursor-pointer border-t border-line hover:bg-[#f7f3ea]", selectedId === row.item.id && "bg-[#f3f7f6]")}
                    onClick={() => setSelectedId(row.item.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.item.name}</div>
                      <div className="text-xs text-muted">{row.item.sku} · {row.purchases.length} purchases</div>
                    </td>
                    <td className="nums px-3 py-3 text-right">{row.previousPrice === null ? "—" : formatMoney(row.previousPrice)}</td>
                    <td className="nums px-3 py-3 text-right">{formatMoney(row.latestPrice)}</td>
                    <td className="px-4 py-3 text-right"><Change change={row.change} pct={row.changePct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="rounded-2xl border border-line bg-card p-4 lg:col-span-2">
          {selected ? (
            <>
              <p className="text-xs tracking-[0.14em] text-muted uppercase">{selected.item.sku}</p>
              <h2 className="mt-1 font-serif text-2xl">{selected.item.name}</h2>
              <p className="mt-1 text-sm text-muted">Latest supplier: {selected.supplierName}</p>
              <ol className="mt-4 space-y-3">
                {[...selected.purchases].reverse().map((point) => (
                  <li key={point.purchase.id} className="rounded-xl border border-line px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{formatDate(point.purchase.date)}</p>
                        <p className="text-xs text-muted">
                          {formatQty(point.purchase.quantity)} {selected.item.unit} · {point.purchase.invoiceNo || "No invoice"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="nums text-sm font-semibold">{formatMoney(point.purchase.unitPrice)}</p>
                        <Change change={point.change} pct={point.changePct} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-sm text-muted">Record at least two purchases of an item to compare prices.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-line bg-card px-4 py-4">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="nums mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </article>
  );
}

function Change({ change, pct }: { change: number | null; pct: number | null }) {
  if (change === null || pct === null) return <span className="text-xs text-muted">First price</span>;
  if (change === 0) return <span className="text-xs text-muted">No change</span>;
  const up = change > 0;
  return (
    <span className={cx("nums text-xs font-semibold", up ? "text-danger" : "text-ok")}>
      {up ? "+" : "−"}
      {formatMoney(Math.abs(change))} ({up ? "+" : "−"}
      {Math.abs(pct).toFixed(1)}%)
    </span>
  );
}
