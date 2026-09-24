import { Dashboard } from "@/components/dashboard";
import { readDb } from "@/lib/store";

export const metadata = { title: "Overview" };

export default function HomePage() {
  return <Dashboard db={readDb()} />;
}
