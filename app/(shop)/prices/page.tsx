import { PricesClient } from "@/components/prices-client";
import { readDb } from "@/lib/store";

export const metadata = { title: "Price comparison" };

export default async function PricesPage() {
  return <PricesClient db={await readDb()} />;
}
