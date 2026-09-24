import { Dashboard } from "@/components/dashboard";
import { readDb } from "@/lib/store";

export const metadata = { title: "Overview" };

export default async function HomePage() {
  return <Dashboard db={await readDb()} />;
}
