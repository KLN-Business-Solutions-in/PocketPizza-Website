"use client";

import React from "react";
import type { MenuItem } from "@shared/contract/contract";
import { Modal } from "@/components/ui/LayoutPrimitives";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";
import { useCartStore } from "@/lib/cart/store";

/**
 * Variant + add-on picker. Writes a CartLine to localStorage cart (§2).
 * Pricing preview is display-only — server recomputes on quote/create (§16.2).
 */
export function ProductModal({
  product,
  onClose,
}: {
  product: MenuItem | null;
  onClose: () => void;
}) {
  const addLine = useCartStore((s) => s.addLine);
  const [variantId, setVariantId] = React.useState<string | undefined>(undefined);
  const [addOnIds, setAddOnIds] = React.useState<string[]>([]);
  const [qty, setQty] = React.useState(1);

  React.useEffect(() => {
    setVariantId(undefined);
    setAddOnIds([]);
    setQty(1);
  }, [product?.id]);

  if (!product) return null;

  const toggleAddon = (id: string) =>
    setAddOnIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const submit = () => {
    addLine({ menuItemId: product.id, variantId, addOnIds, quantity: qty });
    onClose();
  };

  return (
    <Modal isOpen={!!product} onClose={onClose} title={product.name}>
      <p className="text-body text-bodySecondary">{product.description}</p>
      <p className="mt-2 font-heading font-bold text-h4 text-brand-red">
        {formatINR(product.basePrice)}
      </p>

      {product.variants.length > 0 && (
        <div className="mt-4">
          <h3 className="font-heading text-label font-bold">Size / Variant</h3>
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
        </div>
      )}

      {product.addOns.length > 0 && (
        <div className="mt-4">
          <h3 className="font-heading text-label font-bold">Add-ons</h3>
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
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </Button>
          <span className="w-8 text-center font-bold">{qty}</span>
          <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.min(20, q + 1))}>
            +
          </Button>
        </div>
        <Button className="flex-1" onClick={submit}>
          Add to Cart
        </Button>
      </div>
      <p className="mt-3 text-caption text-mutedGray">
        Final total is calculated securely at checkout. Prices in INR.
      </p>
    </Modal>
  );
}
