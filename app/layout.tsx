import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { readDb } from "@/lib/store";
import { statusOf } from "@/lib/inventory";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Packwell Inventory",
    template: "%s · Packwell",
  },
  description: "Stock, purchases, and costs for Packwell Printers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const db = readDb();
  const alertCount = db.items.filter((item) => statusOf(item) !== "ok").length;

  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <body className="font-sans antialiased">
        <Sidebar alertCount={alertCount} usingSample={db.meta.usingSample} />
        <div className="min-h-screen pt-14 lg:pt-0 lg:pl-64">
          <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
