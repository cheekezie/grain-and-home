"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from "react";
import type { CartItem } from "./types";

const STORAGE_KEY = "basket-v2";

/** One basket line per product, or per product + chosen options. */
export const lineKey = (i: { productId: string; variantId?: string; choices?: string[] }) =>
  i.choices?.length ? `${i.productId}:${i.choices.join("|")}` : i.variantId ? `${i.productId}:${i.variantId}` : i.productId;

type Listener = () => void;
let listeners: Listener[] = [];
let cache: CartItem[] | null = null;

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): CartItem[] {
  if (cache === null) cache = readCart();
  return cache;
}

const EMPTY_CART: CartItem[] = [];

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function subscribe(listener: Listener) {
  listeners.push(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeCart(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage unavailable (private mode, quota, etc.) — cart just won't persist
  }
  listeners.forEach((l) => l());
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  /** By lineKey(item). */
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  /** False during server render and hydration, before the saved basket is read. */
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
    const current = getSnapshot();
    const key = lineKey(item);
    const existing = current.find((i) => lineKey(i) === key);
    const next = existing
      ? current.map((i) =>
          lineKey(i) === key
            ? { ...i, quantity: Math.min(i.quantity + quantity, 20) }
            : i
        )
      : [...current, { ...item, quantity }];
    writeCart(next);
  };

  const removeItem = (key: string) => {
    writeCart(getSnapshot().filter((i) => lineKey(i) !== key));
  };

  const setQuantity = (key: string, quantity: number) => {
    const current = getSnapshot();
    writeCart(
      quantity <= 0
        ? current.filter((i) => lineKey(i) !== key)
        : current.map((i) => (lineKey(i) === key ? { ...i, quantity } : i))
    );
  };

  const clear = () => writeCart([]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQuantity, clear, subtotal, count, ready }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
