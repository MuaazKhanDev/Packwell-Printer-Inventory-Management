import type { Database, Item, Purchase, Supplier } from "@/lib/types";

export type PricePoint = {
  purchase: Purchase;
  previousPrice: number | null;
  change: number | null;
  changePct: number | null;
};

export type PriceRow = {
  item: Item;
  supplierName: string;
  purchases: PricePoint[];
  latestPrice: number;
  previousPrice: number | null;
  change: number | null;
  changePct: number | null;
};

function byDate(a: Purchase, b: Purchase) {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}

export function priceRows(db: Database): PriceRow[] {
  const suppliers = new Map(db.suppliers.map((supplier) => [supplier.id, supplier]));
  return db.items
    .map((item) => toRow(item, db.purchases.filter((purchase) => purchase.itemId === item.id).sort(byDate), suppliers))
    .filter((row): row is PriceRow => row !== null)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0) || a.item.name.localeCompare(b.item.name));
}

function toRow(item: Item, purchases: Purchase[], suppliers: Map<string, Supplier>): PriceRow | null {
  if (purchases.length === 0) return null;
  const points: PricePoint[] = purchases.map((purchase, index) => {
    const previousPrice = index === 0 ? null : purchases[index - 1].unitPrice;
    const change = previousPrice === null ? null : purchase.unitPrice - previousPrice;
    const changePct = previousPrice ? ((purchase.unitPrice - previousPrice) / previousPrice) * 100 : null;
    return { purchase, previousPrice, change, changePct };
  });
  const latest = points[points.length - 1];
  return {
    item,
    supplierName: suppliers.get(latest.purchase.supplierId)?.name ?? "—",
    purchases: points,
    latestPrice: latest.purchase.unitPrice,
    previousPrice: latest.previousPrice,
    change: latest.change,
    changePct: latest.changePct,
  };
}
