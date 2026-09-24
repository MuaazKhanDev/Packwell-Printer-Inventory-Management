import { Sidebar } from "@/components/sidebar";
import { DatabaseSetup } from "@/components/database-setup";
import { readDb, usesDatabase } from "@/lib/store";
import { statusOf } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL && !usesDatabase()) {
    return <DatabaseSetup />;
  }

  const db = await readDb();
  const alertCount = db.items.filter((item) => statusOf(item) !== "ok").length;

  return (
    <>
      <Sidebar alertCount={alertCount} usingSample={db.meta.usingSample} shared={usesDatabase()} />
      <div className="min-h-screen pt-14 lg:pt-0 lg:pl-64">
        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </>
  );
}
