"use client";

import React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderType } from "@shared/contract/contract";

/**
 * Cart lives in browser localStorage per Backend Master Reference §2
 * ("Cart persisted server-side" is out of scope). Server recomputes
 * all pricing — client totals are discarded (§16.2).
 */

/**
 * Upper bound on a single cart line.
 *
 * The contract's own ceiling is 99 (`quoteItemSchema.quantity`, contract.ts:93).
 * 20 is deliberately tighter — a tighter client cap can only ever prevent a
 * server rejection, never cause one. Kept in one place so the modal and the
 * cart page cannot drift apart.
 */
export const MAX_LINE_QUANTITY = 20;

/** Contract cap on `quoteRequestSchema.items` — 50 line items per order. */
export const MAX_CART_LINES = 50;

/** Contract cap on `quoteItemSchema.addOnIds` — 20 add-ons on a single line. */
export const MAX_LINE_ADDONS = 20;

export type CartLine = {
  /** Stable client-side line id (menuItemId + variant + addOns hash). */
  key: string;
  menuItemId: string;
  variantId?: string;
  addOnIds: string[];
  quantity: number;
  /**
   * UI-ONLY display fields (sprint §Day 4). Snapshotted at add-to-cart time so
   * the cart and checkout keep rendering a real name/price even after the live
   * menu changes — and, critically, even when the server rejects the line.
   * NEVER submitted. The server re-prices from ids on Day 6 (§16.2).
   */
  /** "Fiery Pepperoni (Medium 12\")" — item name plus variant label. */
  displayName: string;
  /** Unit price for this configuration, decimal string, before × quantity. */
  displayPrice: string;
  /** Additive UI-only labels so add-ons stay spelled out offline. */
  variantLabel?: string | null;
  addOnLabels?: string[];
};

/** What the caller supplies; the store derives `key`. */
export type CartLineDraft = Omit<CartLine, "key">;

/**
 * `addLine` refuses rather than silently dropping, so the caller can tell the
 * customer why. The only current refusal is a full cart (contract cap, 50).
 */
export type AddLineResult = { ok: true } | { ok: false; reason: "cart-full"; limit: number };


export type OrderTypeState = OrderType;

type CartState = {
  lines: CartLine[];
  orderType: OrderTypeState;
  addLine: (line: CartLineDraft) => AddLineResult;
  updateQty: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  /**
   * Day 4: drop every line whose menuItemId is no longer in the active menu
   * payload. Returns the removed lines so the caller can raise a toast.
   * Variant/add-on removals are NOT handled here — the server quote rejects
   * those on Day 6 and the checkout marks the offending line.
   */
  evictInactive: (activeMenuItemIds: Iterable<string>) => CartLine[];
  clear: () => void;
  setOrderType: (t: OrderTypeState) => void;
};

export function lineKey(l: Pick<CartLineDraft, "menuItemId" | "variantId" | "addOnIds">): string {
  const addons = [...(l.addOnIds || [])].sort().join(",");
  return `${l.menuItemId}|${l.variantId ?? ""}|${addons}`;
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

/**
 * Defensive guard for anything read back out of localStorage: a hand-edited or
 * stale payload must never put an unpriceable line into the cart.
 */
function isRenderableLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const l = value as Partial<CartLine>;
  return (
    typeof l.menuItemId === "string" &&
    l.menuItemId.length > 0 &&
    Array.isArray(l.addOnIds) &&
    typeof l.displayName === "string" &&
    l.displayName.length > 0 &&
    typeof l.displayPrice === "string" &&
    /^(\d+(\.\d{1,2})?)$/.test(l.displayPrice)
  );
}

function sanitizeLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: CartLine[] = [];
  // A hand-edited or stale localStorage payload can hold more lines or more
  // add-ons than the contract allows. Trim here so the cart can never be
  // un-quotable for a reason the customer did not cause.
  for (const raw of value.slice(0, MAX_CART_LINES)) {
    if (!isRenderableLine(raw)) continue;
    const addOnIds = raw.addOnIds
      .filter((id): id is string => typeof id === "string")
      .slice(0, MAX_LINE_ADDONS);
    const draft: CartLineDraft = {
      menuItemId: raw.menuItemId,
      variantId: typeof raw.variantId === "string" ? raw.variantId : undefined,
      addOnIds,
      quantity: clampQuantity(raw.quantity),
      displayName: raw.displayName,
      displayPrice: raw.displayPrice,
      variantLabel: raw.variantLabel ?? null,
      addOnLabels: Array.isArray(raw.addOnLabels) ? raw.addOnLabels : [],
    };
    const key = lineKey(draft);
    if (seen.has(key)) continue; // de-dupe a hand-edited payload
    seen.add(key);
    out.push({ ...draft, key });
  }
  return out;
}

/**
 * v1 → v2: v1 lines had no displayName/displayPrice. They cannot be labelled
 * or priced client-side and the server would reject them on Day 6 anyway, so
 * they are dropped and the old cart self-heals to empty.
 */
function migratePersistedCart(
  persisted: unknown,
  fromVersion: number
): { lines: CartLine[]; orderType: OrderTypeState } | undefined {
  const state = (persisted ?? {}) as { lines?: unknown; orderType?: unknown };
  const orderType: OrderTypeState =
    state.orderType === "DELIVERY" || state.orderType === "PICKUP" || state.orderType === "DINE_IN"
      ? state.orderType
      : "DELIVERY";
  if (fromVersion < 2) {
    return { lines: [], orderType };
  }
  return { lines: sanitizeLines(state.lines), orderType };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orderType: "DELIVERY",
      addLine: (line) => {
        const current = get().lines;
        const draft: CartLineDraft = {
          ...line,
          addOnIds: (line.addOnIds ?? []).slice(0, MAX_LINE_ADDONS),
        };
        const key = lineKey(draft);
        const quantity = clampQuantity(draft.quantity);
        const existing = current.find((l) => l.key === key);
        if (existing) {
          set({
            lines: current.map((l) =>
              l.key === key ? { ...l, quantity: clampQuantity(l.quantity + quantity) } : l
            ),
          });
          return { ok: true };
        }
        // Refuse a genuinely new line past the contract cap rather than letting
        // the customer build a cart that is guaranteed to 400 at quote time.
        if (current.length >= MAX_CART_LINES) {
          return { ok: false, reason: "cart-full", limit: MAX_CART_LINES };
        }
        set({ lines: [...current, { ...draft, quantity, key }] });
        return { ok: true };
      },
      updateQty: (key, quantity) => {
        if (quantity <= 0) {
          set({ lines: get().lines.filter((l) => l.key !== key) });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.key === key ? { ...l, quantity: clampQuantity(quantity) } : l
          ),
        });
      },
      removeLine: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      evictInactive: (activeMenuItemIds) => {
        const active = new Set(activeMenuItemIds);
        const removed = get().lines.filter((l) => !active.has(l.menuItemId));
        if (removed.length === 0) return [];
        set({ lines: get().lines.filter((l) => active.has(l.menuItemId)) });
        return removed;
      },
      clear: () => set({ lines: [] }),
      setOrderType: (t) => set({ orderType: t }),
    }),
    {
      name: "pokket-cart",
      version: 2,
      partialize: (state) => ({ lines: state.lines, orderType: state.orderType }),
      migrate: migratePersistedCart,
      // Always validate on read: zustand's default merge spreads the raw parsed
      // payload ({...current, ...persisted}), which would let a tampered
      // localStorage overwrite store actions or inject unvalidated lines.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { lines?: unknown; orderType?: unknown };
        const orderType: OrderTypeState =
          p.orderType === "DELIVERY" || p.orderType === "PICKUP" || p.orderType === "DINE_IN"
            ? p.orderType
            : current.orderType;
        return { ...current, lines: sanitizeLines(p.lines), orderType };
      },
    }
  )
);

/** Never changes: localStorage rehydration is synchronous at module init. */
const subscribeHydrated = () => () => {};

/**
 * True after hydration, false during SSR. localStorage rehydration is
 * synchronous, so the snapshot is simply "server: false, client: true" —
 * useSyncExternalStore serves the server snapshot during hydration and flips
 * to true right after, keeping the first client render identical to the
 * server markup (no badge mismatch). Replaces an onRehydrateStorage flag that
 * ran synchronously inside create() and hit the temporal dead zone of the
 * useCartStore binding itself (ReferenceError → flag never set).
 */
export function useCartHydrated(): boolean {
  return React.useSyncExternalStore(subscribeHydrated, () => true, () => false);
}
