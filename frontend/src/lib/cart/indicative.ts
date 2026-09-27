import type { MenuItem, MenuItemAddon, MenuItemVariant } from "@shared/contract/contract";
import { multiplyMoney, sumMoney } from "@/lib/money";

/**
 * Indicative (pre-quote) pricing for a product customisation.
 *
 * Day 4 requirement:
 *   indicative = (basePrice + priceDelta + Σ addOns) × quantity
 *
 * This exists ONLY so the customer sees something while choosing. It is never
 * submitted and never authoritative — the server re-prices on quote/create
 * (§16.2). Kept pure (no React, no store) so it is trivially testable and can
 * be reused by the product modal, the cart page and the cart store.
 */

export type ProductSelection = {
  variantId?: string;
  addOnIds: string[];
};

/** Everything the UI needs to describe a customisation, resolved from the menu. */
export type ResolvedSelection = {
  variant: MenuItemVariant | null;
  addOns: MenuItemAddon[];
  /** basePrice + priceDelta + Σ addOns, as a decimal string. */
  unitPrice: string;
};

export function findVariant(product: MenuItem, variantId?: string): MenuItemVariant | null {
  if (!variantId) return null;
  return product.variants.find((v) => v.id === variantId) ?? null;
}

/** Resolve a selection against the live product, ignoring unknown ids. */
export function resolveSelection(product: MenuItem, selection: ProductSelection): ResolvedSelection {
  const variant = findVariant(product, selection.variantId);
  const addOns = (selection.addOnIds ?? [])
    .map((id) => product.addOns.find((a) => a.id === id))
    .filter((a): a is MenuItemAddon => Boolean(a));

  return {
    variant,
    addOns,
    unitPrice: sumMoney([product.basePrice, variant?.priceDelta, ...addOns.map((a) => a.price)]),
  };
}

/** (basePrice + priceDelta + Σ addOns) × quantity, decimal string. */
export function indicativeLineTotal(
  product: MenuItem,
  selection: ProductSelection,
  quantity: number
): string {
  const { unitPrice } = resolveSelection(product, selection);
  return multiplyMoney(unitPrice, Math.max(0, Math.trunc(quantity)));
}

/** Short human label for the variant, or null when the standard size is used. */
export function variantLabel(product: MenuItem, variantId?: string): string | null {
  return findVariant(product, variantId)?.label ?? null;
}

/** Human labels for the selected add-ons, in selection order. */
export function addOnLabels(product: MenuItem, addOnIds: string[]): string[] {
  return (addOnIds ?? [])
    .map((id) => product.addOns.find((a) => a.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}
