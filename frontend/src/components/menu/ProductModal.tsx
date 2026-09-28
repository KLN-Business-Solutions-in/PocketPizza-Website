"use client";

import React from "react";
import type { MenuItem } from "@shared/contract/contract";
import { Modal } from "@/components/ui/LayoutPrimitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { formatINR, multiplyMoney } from "@/lib/money";
import { addOnLabels, resolveSelection, variantLabel } from "@/lib/cart/indicative";
import { MAX_LINE_QUANTITY, useCartStore } from "@/lib/cart/store";

/**
 * Day 4 variant + add-on picker. Writes a CartLine to the localStorage cart
 * (§2).
 *
 * The live price shown here is INDICATIVE ONLY — (basePrice + priceDelta +
 * Σ addOns) × quantity — so the customer sees something while choosing. It is
 * never submitted; the server re-prices on quote and on create (§16.2).
 *
 * The line is written with UI-only display fields (displayName/displayPrice)
 * so the cart keeps rendering a real name and price after the live menu
 * changes, and even when the server later rejects the line.
 */
export function ProductModal({
  product,
  onClose,
}: {
  product: MenuItem | null;
  onClose: () => void;
}) {
  const addLine = useCartStore((s) => s.addLine);
  const { push } = useToast();
  // Remounted by the parent whenever `product` changes, so this state starts
  // fresh for each item without a reset effect.
  const [variantId, setVariantId] = React.useState<string | undefined>(undefined);
  const [addOnIds, setAddOnIds] = React.useState<string[]>([]);
  const [qty, setQty] = React.useState(1);

  if (!product) return null;

  const toggleAddon = (id: string) =>
    setAddOnIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const selection = { variantId, addOnIds };
  const { unitPrice } = resolveSelection(product, selection);
  const indicativeTotal = formatINR(multiplyMoney(unitPrice, qty));

  const submit = () => {
    const vLabel = variantLabel(product, variantId);
    const aLabels = addOnLabels(product, addOnIds);
    addLine({
      menuItemId: product.id,
      variantId,
      addOnIds,
      quantity: qty,
      displayName: vLabel ? `${product.name} (${vLabel})` : product.name,
      displayPrice: unitPrice,
      variantLabel: vLabel,
      addOnLabels: aLabels,
    });
    push(
      qty > 1 ? `${qty} × ${product.name} added to your cart.` : `${product.name} added to your cart.`
    );
    onClose();
  };

  return (
    <Modal isOpen={!!product} onClose={onClose} title={product.name}>
      <p className="text-body text-bodySecondary">{product.description}</p>
      <p className="mt-2 font-heading font-bold text-h4 text-brand-red">
        {formatINR(product.basePrice)}
      </p>

      {product.variants.length > 0 && (
        <fieldset className="mt-4">
          <legend className="font-heading text-label font-bold">Size / Variant</legend>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-body">
              <input
                type="radio"
                name="variant"
                checked={!variantId}
                onChange={() => setVariantId(undefined)}
              />
              Standard ({formatINR(product.basePrice)})
            </label>
            {product.variants.map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-body">
                <input
                  type="radio"
                  name="variant"
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                />
                {v.label} (+{formatINR(v.priceDelta)})
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.addOns.length > 0 && (
        <fieldset className="mt-4">
          <legend className="font-heading text-label font-bold">Add-ons</legend>
          <div className="mt-2 flex flex-col gap-2">
            {product.addOns.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={addOnIds.includes(a.id)}
                  onChange={() => toggleAddon(a.id)}
                />
                {a.label} (+{formatINR(a.price)})
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
          >
            −
          </Button>
          <span className="w-8 text-center font-bold" aria-live="polite">
            {qty}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQty((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
            disabled={qty >= MAX_LINE_QUANTITY}
            aria-label="Increase quantity"
          >
            +
          </Button>
        </div>
        <Button className="flex-1" onClick={submit}>
          Add to Cart
        </Button>
      </div>

      {/* Day 4: live indicative price preview. Display only — never submitted. */}
      <div
        className="mt-4 flex items-baseline justify-between rounded-md bg-neutralTint px-4 py-3"
        aria-live="polite"
      >
        <div>
          <p className="text-caption uppercase tracking-wide text-mutedGray">Indicative total</p>
          <p className="text-caption text-bodySecondary">
            {qty} × {formatINR(unitPrice)}
          </p>
        </div>
        <p className="font-heading font-extrabold text-h4 text-charcoal">{indicativeTotal}</p>
      </div>
      <p className="mt-3 text-caption text-mutedGray">
        Indicative only. Final total is calculated securely by the server at checkout. Prices in INR.
      </p>
    </Modal>
  );
}
