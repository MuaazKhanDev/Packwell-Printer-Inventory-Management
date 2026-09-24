import { PurchasesClient } from "@/components/purchases-client";
import { readDb } from "@/lib/store";

export const metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  return <PurchasesClient db={await readDb()} />;
}
