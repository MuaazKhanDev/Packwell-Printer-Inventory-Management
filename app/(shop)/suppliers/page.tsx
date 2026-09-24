import { SuppliersClient } from "@/components/suppliers-client";
import { readDb } from "@/lib/store";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  return <SuppliersClient db={await readDb()} />;
}
