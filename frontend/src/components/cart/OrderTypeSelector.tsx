"use client";

import type { OrderType } from "@shared/contract/contract";
import { cn } from "@/lib/utils";

export const ORDER_TYPES: readonly OrderType[] = ["DELIVERY", "PICKUP", "DINE_IN"] as const;

const LABELS: Record<OrderType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
};

const HINTS: Record<OrderType, string> = {
  DELIVERY: "Delivered to your address. A delivery fee applies.",
  PICKUP: "Collect from the store. No delivery fee.",
  DINE_IN: "Eat at the store. No delivery fee.",
};

/**
 * Order type selector — shared by the cart page and checkout so the two can
 * never drift. Day 5/6: switching this re-quotes the order on the server, and
 * only DELIVERY requires an address and charges a delivery fee.
 */
export function OrderTypeSelector({
  value,
  onChange,
  idPrefix = "order-type",
}: {
  value: OrderType;
  onChange: (t: OrderType) => void;
  idPrefix?: string;
}) {
  return (
    <div>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Order type"
      >
        {ORDER_TYPES.map((t) => {
          const selected = value === t;
          return (
            <button
              key={t}
              id={`${idPrefix}-${t}`}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(t)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-heading font-semibold transition-colors",
                selected
                  ? "bg-brand-red text-white"
                  : "bg-neutralTint text-charcoal hover:bg-blushTint hover:text-brand-red"
              )}
            >
              {LABELS[t]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-caption text-mutedGray">{HINTS[value]}</p>
    </div>
  );
}
