import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
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
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
