"use client";

// Tiny toast bus: anything can call showToast(); the <Toaster> in the store
// layout listens and renders it.
export interface Toast {
  title: string;
  body?: string;
  image?: string | null;
  action?: { label: string; href: string };
}

const EVENT = "gh:toast";

export function showToast(t: Toast) {
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: t }));
}

export function onToast(handler: (t: Toast) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<Toast>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
