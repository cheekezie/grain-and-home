"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Thin bar across the top of the window while a client-side navigation
// loads. Starts on a click on any internal link (or browser back/forward),
// creeps towards 90%, and completes once the page on screen has changed.
// Used by both the public site and the admin (mounted once in the root
// layout).
//
// "Completed" means: the rendered URL now equals where we were going, or
// differs from where we started (covers redirects). Checking both on every
// tick, not just when the URL changes, matters for Back/Forward: Next can
// render the restored page before our popstate listener runs, so the
// change can land before the bar has even started.

type Phase = "idle" | "loading" | "done";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [width, setWidth] = useState(0);

  const rendered = useRef("");
  const nav = useRef<{ from: string; to: string } | null>(null);
  const timers = useRef<{ trickle?: ReturnType<typeof setInterval>; hide?: ReturnType<typeof setTimeout>; safety?: ReturnType<typeof setTimeout> }>({});
  const check = useRef<() => void>(() => {});

  useEffect(() => {
    const clearTimers = () => {
      clearInterval(timers.current.trickle);
      clearTimeout(timers.current.hide);
      clearTimeout(timers.current.safety);
    };

    const finish = () => {
      if (!nav.current) return;
      nav.current = null;
      clearTimers();
      setWidth(100);
      setPhase("done");
      timers.current.hide = setTimeout(() => {
        setPhase("idle");
        setWidth(0);
      }, 350);
    };

    const settled = () => {
      const n = nav.current;
      if (n && (rendered.current === n.to || rendered.current !== n.from)) finish();
    };
    check.current = settled;

    const start = (to: string, from: string) => {
      clearTimers();
      nav.current = { from, to };
      setPhase("loading");
      setWidth(8);
      timers.current.trickle = setInterval(() => {
        setWidth((w) => w + (90 - w) * 0.08);
        settled();
      }, 200);
      // A cancelled or silently failed navigation shouldn't spin forever.
      timers.current.safety = setTimeout(() => {
        nav.current ??= { from: "", to: "" };
        finish();
      }, 15000);
      settled();
    };

    const here = () => location.pathname + location.search;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const to = url.pathname + url.search;
      if (to === here()) return; // same page, or only the #hash changes
      start(to, rendered.current);
    };

    // By the time popstate fires the address bar already shows the target.
    const onPop = () => start(here(), rendered.current === here() ? "" : rendered.current);

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      clearTimers();
    };
  }, []);

  // The page on screen changed.
  useEffect(() => {
    const qs = searchParams.toString();
    rendered.current = pathname + (qs ? `?${qs}` : "");
    check.current();
  }, [pathname, searchParams]);

  if (phase === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className={`h-full bg-moss shadow-[0_0_8px_rgb(62_92_74/0.6)] transition-[width,opacity] ease-out ${
          phase === "done" ? "opacity-0 duration-300" : "opacity-100 duration-200"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
