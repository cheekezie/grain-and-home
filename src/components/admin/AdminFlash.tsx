"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { showToast } from "@/lib/toast";

// Server actions redirect with ?flash=<message>[&flashHref=<link>] after a
// create or delete; this turns it into a toast and removes it from the URL
// so a refresh doesn't show it again.
export default function AdminFlash() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const flash = params.get("flash");
  const href = params.get("flashHref");

  useEffect(() => {
    if (!flash) return;
    showToast({ title: flash, action: href?.startsWith("/admin/") ? { label: "Open it", href } : undefined });
    const rest = new URLSearchParams(params);
    rest.delete("flash");
    rest.delete("flashHref");
    router.replace(rest.size ? `${path}?${rest}` : path, { scroll: false });
  }, [flash, href, params, path, router]);

  return null;
}
