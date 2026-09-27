"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface AdminNavItem {
  href: string;
  label: string;
  /** Count that needs attention, e.g. orders to place. Hidden when 0. */
  badge?: number;
}

// Admin navigation. Desktop: a sidebar pinned to the viewport while the page
// scrolls. Mobile: a sticky top bar whose Menu button opens the same links
// in a drawer (Escape, the backdrop or picking a link closes it).
export default function AdminSidebar({
  brand,
  subtitle,
  items,
  footer,
}: {
  brand: React.ReactNode;
  subtitle: string;
  items: AdminNavItem[];
  footer: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const attention = items.reduce((n, i) => n + (i.badge ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const trigger = menuButton.current;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  const nav = (onPick?: () => void) => (
    <nav aria-label="Admin">
      <ul>
        {items.map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                onClick={onPick}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[15px] font-semibold ${active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              >
                {i.label}
                {!!i.badge && (
                  <span className="tabular rounded-full bg-white px-2 text-[12px] text-ink" aria-label={`${i.badge} need attention`}>{i.badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const head = (
    <div className="p-4">
      {brand}
      <p className="mt-1 text-[13px] text-white/60">{subtitle}</p>
    </div>
  );

  return (
    <>
      {/* Mobile: sticky bar + drawer */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-ink px-4 py-3 text-white lg:hidden">
        {brand}
        <button
          ref={menuButton}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="flex items-center gap-2 rounded-lg border border-white/25 px-3 py-1.5 text-[15px] font-semibold"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
          Menu
          {attention > 0 && <span className="tabular rounded-full bg-white px-1.5 text-[12px] text-ink">{attention}</span>}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" id="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/50" />
          <div className="relative flex h-full w-[min(18rem,85vw)] flex-col overflow-y-auto bg-ink text-white shadow-xl">
            <div className="flex items-start justify-between">
              {head}
              <button ref={closeButton} type="button" onClick={() => setOpen(false)} className="m-3 rounded-lg px-2 py-1 text-[15px] font-semibold hover:bg-white/10">
                Close
              </button>
            </div>
            {nav(() => setOpen(false))}
            <div className="mt-auto flex flex-col gap-2 p-4 text-[14px]">{footer}</div>
          </div>
        </div>
      )}

      {/* Desktop: pinned sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-ink text-white lg:flex">
        {head}
        {nav()}
        <div className="mt-8 flex flex-col gap-2 px-4 pb-4 text-[14px]">{footer}</div>
      </aside>
    </>
  );
}
