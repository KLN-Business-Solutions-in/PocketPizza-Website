"use client";

import React from "react";
import type { MenuItem } from "@shared/contract/contract";
import { ErrorState, Modal } from "@/components/ui/LayoutPrimitives";
import { Button } from "@/components/ui/Button";
import { calculateIndicativeTotal, calculateIndicativeUnitPrice, formatINR } from "@/lib/money";
import { useCartStore } from "@/lib/cart/store";
import { useProduct } from "@/lib/api/useMenu";
import { ApiError } from "@/lib/api";

/**
 * Variant + add-on picker. Writes a CartLine to localStorage cart (§2).
 * Pricing preview is display-only — server recomputes on quote/create (§16.2).
 */
export function ProductModal({
  product,
  onClose,
  canAdd = true,
}: {
  product: MenuItem | null;
  onClose: () => void;
  canAdd?: boolean;
}) {
  const productQuery = useProduct(product?.id);
  const detailUnavailable =
    productQuery.error instanceof ApiError &&
    (productQuery.error.status === 404 || productQuery.error.code === "CONTRACT_MISMATCH");
  const canSubmit = canAdd && !detailUnavailable;

  if (!product) return null;

  return (
    <ProductModalContent
      key={product.id}
      product={product}
      liveProduct={productQuery.data}
      isRefreshing={productQuery.isPending}
      refreshError={productQuery.isError}
      onRetry={() => void productQuery.refetch()}
      canAdd={canSubmit}
      onClose={onClose}
    />
  );
}

function ProductModalContent({
  product,
  liveProduct,
  isRefreshing,
  refreshError,
  onRetry,
  canAdd,
  onClose,
}: {
  product: MenuItem;
  liveProduct?: MenuItem;
  isRefreshing: boolean;
  refreshError: boolean;
  onRetry: () => void;
  canAdd: boolean;
  onClose: () => void;
}) {
  const addLine = useCartStore((state) => state.addLine);
  const [variantId, setVariantId] = React.useState<string | undefined>();
  const [addOnIds, setAddOnIds] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);
  const activeProduct = liveProduct ?? product;
  const description = activeProduct.description?.trim() || "A tasty pick from our kitchen.";
  const selectedVariant = activeProduct.variants.find((variant) => variant.id === variantId);
  const selectedAddOns = activeProduct.addOns.filter((addOn) => addOnIds.includes(addOn.id));
  const unitPrice = calculateIndicativeUnitPrice(
    activeProduct.basePrice,
    selectedVariant?.priceDelta,
    selectedAddOns.map((addOn) => addOn.price)
  );
  const indicativeTotal = calculateIndicativeTotal(unitPrice, quantity);

  const toggleAddon = (id: string) =>
    setAddOnIds((current) =>
      current.includes(id) ? current.filter((addonId) => addonId !== id) : [...current, id]
    );

  const submit = () => {
    if (!canAdd) return;
    addLine({
      menuItemId: activeProduct.id,
      variantId: selectedVariant?.id,
      addOnIds: selectedAddOns.map((addOn) => addOn.id),
      quantity,
      displayName: activeProduct.name,
      displayPrice: unitPrice,
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={activeProduct.name}>
      {refreshError && (
        <div className="mb-4">
          <ErrorState
            message="We could not refresh this item's live details. Showing the menu snapshot."
            onRetry={onRetry}
          />
        </div>
      )}
      {!canAdd && (
        <div className="mb-4">
          <ErrorState message="This item is no longer available and cannot be added." />
        </div>
      )}
      {isRefreshing && <p className="mb-3 text-caption text-mutedGray">Refreshing live item details…</p>}
      <p className="text-body text-bodySecondary">{description}</p>
      <p className="mt-2 font-heading text-h4 font-bold text-brand-red">
        {formatINR(activeProduct.basePrice)}
      </p>

      {activeProduct.variants.length > 0 && (
        <div className="mt-4">
          <h3 className="font-heading text-label font-bold">Size / Variant</h3>
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-body">
              <input
                type="radio"
                name="variant"
                checked={!selectedVariant}
                onChange={() => setVariantId(undefined)}
              />
              Standard ({formatINR(activeProduct.basePrice)})
            </label>
            {activeProduct.variants.map((variant) => (
              <label key={variant.id} className="flex items-center gap-2 text-body">
                <input
                  type="radio"
                  name="variant"
                  checked={variantId === variant.id}
                  onChange={() => setVariantId(variant.id)}
                />
                {variant.label} (+{formatINR(variant.priceDelta)})
              </label>
            ))}
          </div>
        </div>
      )}

      {activeProduct.addOns.length > 0 && (
        <div className="mt-4">
          <h3 className="font-heading text-label font-bold">Add-ons</h3>
          <div className="mt-2 flex flex-col gap-2">
            {activeProduct.addOns.map((addOn) => (
              <label key={addOn.id} className="flex items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={addOnIds.includes(addOn.id)}
                  onChange={() => toggleAddon(addOn.id)}
                />
                {addOn.label} (+{formatINR(addOn.price)})
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border-default bg-cream-alt p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-body">
          <span>Item price</span>
          <span className="font-semibold">{formatINR(unitPrice)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-body">
          <span>Indicative total ({quantity})</span>
          <span className="font-heading text-h4 font-extrabold text-brand-red">
            {formatINR(indicativeTotal)}
          </span>
        </div>
        <p className="mt-2 text-caption text-mutedGray">
          Estimate only. The server confirms the final price at checkout.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            −
          </Button>
          <span className="w-8 text-center font-bold">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity((current) => Math.min(20, current + 1))}
            disabled={quantity >= 20}
          >
            +
          </Button>
        </div>
        <Button type="button" className="flex-1" onClick={submit} disabled={!canAdd}>
          {canAdd ? "Add to Cart" : "Unavailable"}
        </Button>
      </div>
      <p className="mt-3 text-caption text-mutedGray">
        Final total is calculated securely at checkout. Prices in INR.
      </p>
    </Modal>
  );
}
