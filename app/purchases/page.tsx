import { PurchasesClient } from "@/components/purchases-client";
import { readDb } from "@/lib/store";

export const metadata = { title: "Purchases" };

export default function PurchasesPage() {
  return <PurchasesClient db={readDb()} />;
}
