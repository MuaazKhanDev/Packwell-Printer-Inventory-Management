import { SuppliersClient } from "@/components/suppliers-client";
import { readDb } from "@/lib/store";

export const metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return <SuppliersClient db={readDb()} />;
}
