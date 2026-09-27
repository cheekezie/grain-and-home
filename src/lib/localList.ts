"use client";

import { useSyncExternalStore } from "react";

// Small lists kept in this browser only (saved items, recently viewed).
// Same pattern as the basket: a cached snapshot, updated across tabs.
export function createLocalList<T>(key: string, max: number) {
  let cache: T[] | null = null;
  const listeners = new Set<() => void>();
  const EMPTY: T[] = [];

  const read = (): T[] => {
    try {
      const raw = localStorage.getItem(key);
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const get = () => (cache ??= read());
  const write = (items: T[]) => {
    cache = items.slice(0, max);
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch { /* storage off: keep in memory */ }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => { if (e.key === key) { cache = null; l(); } };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
  };

  return {
    useList: () => useSyncExternalStore(subscribe, get, () => EMPTY),
    get,
    write,
  };
}
