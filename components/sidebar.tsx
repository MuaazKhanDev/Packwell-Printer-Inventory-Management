"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { startFresh } from "@/lib/actions";
import { Button, Modal, cx } from "@/components/ui";

const links = [
  { href: "/", label: "Overview", icon: GridIcon },
  { href: "/inventory", label: "Inventory", icon: BoxIcon },
  { href: "/purchases", label: "Purchases", icon: ReceiptIcon },
  { href: "/suppliers", label: "Suppliers", icon: PeopleIcon },
];

export function Sidebar({ alertCount, usingSample }: { alertCount: number; usingSample: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 lg:hidden">
        <button type="button" className="rounded-md p-1" aria-label="Open menu" onClick={() => setOpen(true)}>
          <MenuIcon />
        </button>
        <span className="font-serif text-xl">Packwell</span>
      </div>
      {open ? (
        <button className="fixed inset-0 z-30 bg-[#1c1915]/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-[#f4f0e6] transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-1">
          <span className="flex-1 bg-[#00a3c8]" />
          <span className="flex-1 bg-[#d4145a]" />
          <span className="flex-1 bg-[#f0c419]" />
          <span className="flex-1 bg-[#d9d3c7]" />
        </div>
        <div className="flex items-center gap-3 px-5 pt-5 pb-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-press font-serif text-xl text-white">P</div>
          <div>
            <div className="font-serif text-2xl leading-none">Packwell</div>
            <div className="mt-1 text-[11px] tracking-[0.16em] text-[#b7b0a4] uppercase">Printers</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-white/10 text-white" : "text-[#d4cec3] hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon />
                <span className="flex-1">{link.label}</span>
                {link.href === "/inventory" && alertCount > 0 ? (
                  <span className="rounded-full bg-[#d4145a] px-1.5 py-0.5 text-[11px] font-semibold text-white">{alertCount}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 px-5 py-4 text-xs text-[#a39c91]">
          <p>Records stay on this computer.</p>
          {usingSample ? (
            <button type="button" className="mt-2 text-left text-[#d4cec3] underline-offset-2 hover:underline" onClick={() => setConfirming(true)}>
              Clear sample data
            </button>
          ) : null}
        </div>
      </aside>
      {confirming ? (
        <Modal title="Clear sample data?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-muted">
            This removes the sample items, purchases, stock movements, and suppliers. You can load the sample again later if the catalogue is empty.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const result = await startFresh();
                setPending(false);
                if (result.ok) {
                  setConfirming(false);
                  setOpen(false);
                  router.refresh();
                }
              }}
            >
              {pending ? "Clearing…" : "Clear sample data"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 6.2 9 3l6 3.2v7.6L9 17l-6-3.2V6.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 6.2 9 9.4 15 6.2M9 9.4V17" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5 2.5h8v13l-1.6-1.1L10 15.8 8.4 14.4 6.6 15.5 5 14.4V2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 6h4M7 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 14.2c.5-2.2 2-3.4 3.8-3.4s3.3 1.2 3.8 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12.2" cy="6.4" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 10.8c1.4.2 2.4 1.1 2.9 2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
