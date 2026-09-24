"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MenuItem, OrderType } from "@shared/contract/contract";
import { isDecimalString } from "@/lib/money";

/**
 * Cart lives in browser localStorage per Backend Master Reference §2.
 * Display fields are snapshots for the UI only; the server re-prices every
 * line on quote/create and checkout submits only IDs, options, and quantity.
 */

export type CartLine = {
  menuItemId: string;
  variantId?: string;
  addOnIds: string[];
  quantity: number;
  displayName: string;
  /** Indicative unit price as a decimal string; never sent to the server. */
  displayPrice: string;
};

type CartLineIdentity = Pick<CartLine, "menuItemId" | "variantId" | "addOnIds">;

export type CartRemovalReason =
  | "ITEM_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE"
  | "ADD_ON_UNAVAILABLE";

export type CartRemoval = {
  line: CartLine;
  reason: CartRemovalReason;
};

export type OrderTypeState = OrderType;

type CartState = {
  lines: CartLine[];
  orderType: OrderTypeState;
  addLine: (line: CartLine) => void;
  updateQty: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  removeInactiveItems: (activeIds: string[]) => CartLine[];
  reconcileAvailability: (products: MenuItem[]) => CartRemoval[];
  clear: () => void;
  setOrderType: (t: OrderTypeState) => void;
  count: () => number;
};

export function lineKey(line: CartLineIdentity): string {
  const addons = [...(line.addOnIds || [])].sort().join(",");
  return `${line.menuItemId}|${line.variantId ?? ""}|${addons}`;
}

function clampQuantity(quantity: number): number {
  return Math.max(1, Math.min(20, Math.floor(quantity)));
}

function normalizeLine(value: unknown): CartLine | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CartLine>;
  if (typeof candidate.menuItemId !== "string" || !candidate.menuItemId) return null;

  const quantity = Number(candidate.quantity);
  if (!Number.isFinite(quantity)) return null;
  const addOnIds = Array.isArray(candidate.addOnIds)
    ? [...new Set(candidate.addOnIds.filter((id): id is string => typeof id === "string"))]
    : [];
  const variantId =
    typeof candidate.variantId === "string" && candidate.variantId.trim()
      ? candidate.variantId
      : undefined;

  return {
    menuItemId: candidate.menuItemId,
    variantId,
    addOnIds,
    quantity: clampQuantity(quantity),
    displayName:
      typeof candidate.displayName === "string" && candidate.displayName.trim()
        ? candidate.displayName
        : candidate.menuItemId,
    displayPrice: isDecimalString(candidate.displayPrice) ? candidate.displayPrice : "0.00",
  };
}

type PersistedCartState = {
  lines?: unknown[];
  orderType?: OrderTypeState;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orderType: "DELIVERY",
      addLine: (line) => {
        const normalized = normalizeLine(line);
        if (!normalized) return;

        const key = lineKey(normalized);
        const existing = get().lines.find((current) => lineKey(current) === key);
        if (existing) {
          set({
            lines: get().lines.map((current) =>
              lineKey(current) === key
                ? {
                    ...current,
                    quantity: clampQuantity(current.quantity + normalized.quantity),
                    displayName: normalized.displayName,
                    displayPrice: normalized.displayPrice,
                  }
                : current
            ),
          });
        } else {
          set({ lines: [...get().lines, normalized] });
        }
      },
      updateQty: (key, quantity) => {
        if (!Number.isFinite(quantity) || quantity <= 0) {
          set({ lines: get().lines.filter((line) => lineKey(line) !== key) });
          return;
        }
        set({
          lines: get().lines.map((line) =>
            lineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : line
          ),
        });
      },
      removeLine: (key) =>
        set({ lines: get().lines.filter((line) => lineKey(line) !== key) }),
      removeInactiveItems: (activeIds) => {
        const active = new Set(activeIds);
        const removed = get().lines.filter((line) => !active.has(line.menuItemId));
        if (removed.length > 0) {
          set({ lines: get().lines.filter((line) => active.has(line.menuItemId)) });
        }
        return removed;
      },
      reconcileAvailability: (products) => {
        const byId = new Map(products.map((product) => [product.id, product]));
        const removals: CartRemoval[] = [];

        for (const line of get().lines) {
          const product = byId.get(line.menuItemId);
          if (!product) {
            removals.push({ line, reason: "ITEM_UNAVAILABLE" });
            continue;
          }
          if (line.variantId && !product.variants.some((variant) => variant.id === line.variantId)) {
            removals.push({ line, reason: "VARIANT_UNAVAILABLE" });
            continue;
          }
          const activeAddOnIds = new Set(product.addOns.map((addOn) => addOn.id));
          if (line.addOnIds.some((id) => !activeAddOnIds.has(id))) {
            removals.push({ line, reason: "ADD_ON_UNAVAILABLE" });
          }
        }

        if (removals.length > 0) {
          const removedKeys = new Set(removals.map(({ line }) => lineKey(line)));
          set({ lines: get().lines.filter((line) => !removedKeys.has(lineKey(line))) });
        }
        return removals;
      },
      clear: () => set({ lines: [] }),
      setOrderType: (orderType) => set({ orderType }),
      count: () => get().lines.reduce((total, line) => total + line.quantity, 0),
    }),
    {
      name: "pokket-cart",
      version: 2,
      partialize: (state) => ({ lines: state.lines, orderType: state.orderType }),
      migrate: (persistedState) => {
        const candidate = (persistedState ?? {}) as PersistedCartState;
        const lines = Array.isArray(candidate.lines)
          ? candidate.lines.flatMap((line) => {
              const normalized = normalizeLine(line);
              return normalized ? [normalized] : [];
            })
          : [];
        return {
          lines,
          orderType: candidate.orderType ?? "DELIVERY",
        };
      },
    }
  )
);