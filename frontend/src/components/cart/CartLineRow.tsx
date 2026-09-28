"use client";

import React from "react";
import type { CartLine } from "@/lib/cart/store";
import { MAX_LINE_QUANTITY } from "@/lib/cart/store";
import { formatINR, multiplyMoney } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * One cart line. Renders entirely from the line's UI-only display fields
 * (displayName / variantLabel / addOnLabels / displayPrice) so the cart stays
 * readable even when the live menu no longer contains the item — the case that
 * previously printed a raw cuid as the heading.
 *
 * `issue` is wired by Day 6: when the server quote rejects this line (item no
 * longer active, variant or add-on removed) the row is marked and a way out is
 * offered, and checkout blocks submission until it is resolved.
 */
export function CartLineRow({
  line,
  index,
  onUpdateQty,
  onRemove,
  issue,
}: {
  line: CartLine;
  index: number;
  onUpdateQty: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  issue?: string;
}) {
  const addOns = line.addOnLabels ?? [];
  const unitPrice = formatINR(line.displayPrice);
  const lineTotal = formatINR(multiplyMoney(line.displayPrice, line.quantity));

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-4 rounded-md border bg-white p-4 shadow-card",
        issue ? "border-brand-red ring-1 ring-brand-red" : "border-border-default"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-caption uppercase tracking-wide text-mutedGray">Item {index + 1}</p>
        <h3 className="font-heading font-bold text-charcoal">{line.displayName}</h3>
        {addOns.length > 0 && (
          <p className="text-caption text-bodySecondary">+ {addOns.join(", ")}</p>
        )}
        <p className="mt-1 text-caption text-mutedGray">
          {line.quantity} × {unitPrice}
        </p>
        {issue && (
          <p
            role="alert"
            className="mt-2 rounded-sm bg-status-errorBg px-3 py-2 text-caption font-medium text-brand-red"
          >
            {issue}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-heading font-bold text-body">{lineTotal}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateQty(line.key, line.quantity - 1)}
            aria-label={`Decrease quantity of ${line.displayName}`}
          >
            −
          </Button>
          <span className="w-6 text-center font-bold">{line.quantity}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateQty(line.key, line.quantity + 1)}
            disabled={line.quantity >= MAX_LINE_QUANTITY}
            aria-label={`Increase quantity of ${line.displayName}`}
          >
            +
          </Button>
        </div>
        <Button
          variant={issue ? "danger" : "ghost"}
          size="sm"
          onClick={() => onRemove(line.key)}
        >
          {issue ? "Remove to fix" : "Remove"}
        </Button>
      </div>
    </li>
  );
}
