"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderType } from "@shared/contract/contract";

/**
 * Cart lives in browser localStorage per Backend Master Reference §2
 * ("Cart persisted server-side" is out of scope). Server recomputes
 * all pricing — client totals are discarded (§16.2).
 */

export type CartLine = {
  /** Stable client-side line id (menuItemId + variant + addOns hash). */
  key: string;
  menuItemId: string;
  variantId?: string;
  addOnIds: string[];
  quantity: number;
};

export type OrderTypeState = OrderType;

type CartState = {
  lines: CartLine[];
  orderType: OrderTypeState;
  addLine: (line: Omit<CartLine, "key">) => void;
  updateQty: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  setOrderType: (t: OrderTypeState) => void;
  count: () => number;
};

export function lineKey(l: Omit<CartLine, "key">): string {
  const addons = [...(l.addOnIds || [])].sort().join(",");
  return `${l.menuItemId}|${l.variantId ?? ""}|${addons}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orderType: "DELIVERY",
      addLine: (line) => {
        const key = lineKey(line);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l
            ),
          });
        } else {
          set({ lines: [...get().lines, { ...line, key }] });
        }
      },
      updateQty: (key, quantity) => {
        if (quantity <= 0) {
          set({ lines: get().lines.filter((l) => l.key !== key) });
          return;
        }
        set({
          lines: get().lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        });
      },
      removeLine: (key) =>
        set({ lines: get().lines.filter((l) => l.key !== key) }),
      clear: () => set({ lines: [] }),
      setOrderType: (t) => set({ orderType: t }),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
    }),
    { name: "pokket-cart" }
  )
);
