"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A button that opens a panel over the page (settings and the like).
// Escape, the backdrop or Close shut it; focus returns to the button.
export default function Modal({
  trigger,
  title,
  children,
  triggerClassName = "rounded-lg border border-line bg-white px-4 py-2 font-semibold hover:border-ink",
  defaultOpen = false,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  triggerClassName?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const button = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const trigger = button.current;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={button} type="button" onClick={() => setOpen(true)} className={triggerClassName} aria-haspopup="dialog">
        {trigger}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={title}>
            <button type="button" aria-label="Close" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 bg-ink/40" />
            <div className="relative w-full max-w-3xl rounded-2xl bg-plaster shadow-lift">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-2xl border-b border-line bg-plaster px-5 py-4">
                <h2 className="font-display text-2xl">{title}</h2>
                <button ref={closeBtn} type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 font-semibold hover:bg-white">
                  Close
                </button>
              </div>
              <div className="space-y-3 p-5">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
