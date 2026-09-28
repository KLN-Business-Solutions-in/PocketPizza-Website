"use client";

import React from "react";
import { useMenuFlat } from "@/lib/api/useMenu";
import { useCartStore } from "@/lib/cart/store";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Day 4: "Only active items are addable — if an item comes back inactive, remove
 * it from the cart with a toast."
 *
 * The public menu endpoint only returns active items, so "is this still
 * available" is answered by a payload diff, not by reading an `isActive` flag
 * (that field only exists on the admin contract type).
 *
 * Guards, in order:
 *  - only after a successful menu load (never while pending/errored);
 *  - only on a genuinely new payload, via the react-query `dataUpdatedAt`
 *    stamp, so re-renders cannot loop;
 *  - never on an empty menu payload — an empty result is far more likely a
 *    bad/partial response than every item being deactivated at once.
 *
 * Variant and add-on removals are deliberately NOT handled here: the server
 * quote rejects those on Day 6 and checkout marks the offending line, which is
 * the only place with an authoritative answer.
 */
export function useCartReconcile() {
  const { products, isSuccess, dataUpdatedAt } = useMenuFlat();
  const evictInactive = useCartStore((s) => s.evictInactive);
  const { push } = useToast();
  const lastReconciledAt = React.useRef(0);

  React.useEffect(() => {
    if (!isSuccess) return;
    if (dataUpdatedAt === lastReconciledAt.current) return;
    lastReconciledAt.current = dataUpdatedAt;
    if (products.length === 0) return;

    const removed = evictInactive(products.map((p) => p.id));
    if (removed.length === 0) return;

    const names = removed.map((l) => l.displayName);
    const list =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    push(
      `${list} ${names.length === 1 ? "is" : "are"} no longer available and ${
        names.length === 1 ? "was" : "were"
      } removed from your cart.`,
      "error"
    );
  }, [isSuccess, dataUpdatedAt, products, evictInactive, push]);
}
