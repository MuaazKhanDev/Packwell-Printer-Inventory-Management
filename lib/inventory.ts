import type { Database, Item, LedgerRow } from "@/lib/types";

export type StockStatus = "out" | "low" | "ok";

type Computed = {
  quantityOnHand: number;
  averageCost: number;
  lastPurchasePrice: number;
  lastPurchaseDate: string | null;
};

type Roll =
  | { error: string }
  | { computed: Computed; rows: LedgerRow[] };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function statusOf(item: Pick<Item, "quantityOnHand" | "reorderLevel">): StockStatus {
  if (item.quantityOnHand <= 0) return "out";
  if (item.quantityOnHand <= item.reorderLevel) return "low";
  return "ok";
}

export function suggestSku(db: Database) {
  let max = 0;
  for (const item of db.items) {
    const match = /^PW-(\d+)$/i.exec(item.sku);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PW-${String(max + 1).padStart(3, "0")}`;
}

function rollItem(db: Database, item: Item): Roll {
  type Event = {
    id: string;
    date: string;
    createdAt: string;
    source: "purchase" | "movement";
    direction: "in" | "out";
    quantity: number;
    unitPrice: number | null;
    label: string;
    party: string;
    note: string;
  };

  const events: Event[] = [];

  for (const purchase of db.purchases) {
    if (purchase.itemId !== item.id) continue;
    const supplier = db.suppliers.find((entry) => entry.id === purchase.supplierId);
    events.push({
      id: purchase.id,
      date: purchase.date,
      createdAt: purchase.createdAt,
      source: "purchase",
      direction: "in",
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      label: "Purchase",
      party: supplier?.name ?? "Unknown supplier",
      note: purchase.invoiceNo || purchase.notes,
    });
  }

  for (const movement of db.movements) {
    if (movement.itemId !== item.id) continue;
    events.push({
      id: movement.id,
      date: movement.date,
      createdAt: movement.createdAt,
      source: "movement",
      direction: movement.direction,
      quantity: movement.quantity,
      unitPrice: null,
      label: movement.reason,
      party: movement.reference,
      note: movement.notes,
    });
  }

  events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );

  let qty = 0;
  let value = 0;
  let lastAvg = 0;
  let lastPurchasePrice = 0;
  let lastPurchaseDate: string | null = null;
  const rows: LedgerRow[] = [];

  for (const event of events) {
    if (event.direction === "in") {
      const price =
        event.unitPrice ?? (qty > 1e-9 ? value / qty : lastAvg);
      qty += event.quantity;
      value += event.quantity * price;
      if (qty > 1e-9) lastAvg = value / qty;
      if (event.source === "purchase" && event.unitPrice !== null) {
        lastPurchasePrice = event.unitPrice;
        lastPurchaseDate = event.date;
      }
    } else if (event.quantity > qty + 1e-6) {
      return {
        error: `Not enough ${item.name} on ${event.date}. Only ${round3(qty)} ${item.unit} would be on hand, and this removal needs ${round3(event.quantity)}.`,
      };
    } else {
      const avg = qty > 1e-9 ? value / qty : 0;
      qty -= event.quantity;
      value = qty * avg;
      if (qty <= 1e-9) {
        qty = 0;
        value = 0;
      }
    }

    rows.push({
      id: event.id,
      date: event.date,
      createdAt: event.createdAt,
      source: event.source,
      direction: event.direction,
      quantity: event.quantity,
      unitPrice: event.unitPrice,
      balance: round3(qty),
      label: event.label,
      party: event.party,
      note: event.note,
    });
  }

  return {
    computed: {
      quantityOnHand: round3(qty),
      averageCost: round2(qty > 0 ? value / qty : lastAvg),
      lastPurchasePrice: round2(lastPurchasePrice),
      lastPurchaseDate,
    },
    rows,
  };
}

export function recompute(db: Database): string | null {
  const pending: Array<{ item: Item; computed: Computed }> = [];

  for (const item of db.items) {
    const result = rollItem(db, item);
    if ("error" in result) return result.error;
    pending.push({ item, computed: result.computed });
  }

  for (const { item, computed } of pending) {
    item.quantityOnHand = computed.quantityOnHand;
    item.averageCost = computed.averageCost;
    item.lastPurchasePrice = computed.lastPurchasePrice;
    item.lastPurchaseDate = computed.lastPurchaseDate;
  }

  return null;
}

export function ledgerFor(db: Database, itemId: string) {
  const item = db.items.find((entry) => entry.id === itemId);
  if (!item) return [];
  const result = rollItem(db, item);
  if ("error" in result) return [];
  return result.rows.slice().reverse();
}
