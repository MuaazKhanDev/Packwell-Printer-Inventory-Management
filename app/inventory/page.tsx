import { InventoryClient } from "@/components/inventory-client";
import { suggestSku } from "@/lib/inventory";
import { readDb } from "@/lib/store";
import type { StockStatus } from "@/lib/inventory";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; item?: string }>;
}) {
  const params = await searchParams;
  const status: "all" | StockStatus =
    params.status === "low" || params.status === "out" || params.status === "ok" ? params.status : "all";
  const db = readDb();
  return (
    <InventoryClient
      db={db}
      initialStatus={status}
      initialItemId={params.item ?? null}
      nextSku={suggestSku(db)}
    />
  );
}
