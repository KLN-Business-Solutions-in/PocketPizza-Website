"use client";

import Link from "next/link";
import { useMenuFlat } from "@/lib/api/useMenu";
import { lineKey, useCartStore } from "@/lib/cart/store";
import { addDecimals, calculateIndicativeTotal, calculateIndicativeUnitPrice, formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";
import type { OrderType } from "@shared/contract/contract";

const ORDER_TYPES: OrderType[] = ["DELIVERY", "PICKUP", "DINE_IN"];

export default function CartPage() {
  const { products, isPending, isFetching, isError, refetch } = useMenuFlat();
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const orderType = useCartStore((state) => state.orderType);
  const setOrderType = useCartStore((state) => state.setOrderType);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeLine = useCartStore((state) => state.removeLine);

  const byId = new Map(products.map((product) => [product.id, product]));
  const availabilityReady = !isPending && !isFetching && !isError;
  const indicativeSubtotal = lines.reduce((subtotal, line) => {
    const product = byId.get(line.menuItemId);
    const variant = product?.variants.find((item) => item.id === line.variantId);
    const addOns = line.addOnIds
      .map((id) => product?.addOns.find((addOn) => addOn.id === id))
      .filter((addOn): addOn is NonNullable<typeof addOn> => Boolean(addOn));
    const customizationAvailable = Boolean(
      product &&
        (!line.variantId || variant) &&
        line.addOnIds.every((id) => product.addOns.some((addOn) => addOn.id === id))
    );
    const unitPrice = product && customizationAvailable
      ? calculateIndicativeUnitPrice(
          product.basePrice,
          variant?.priceDelta,
          addOns.map((addOn) => addOn.price)
        )
      : line.displayPrice !== "0.00"
        ? line.displayPrice
        : null;
    return unitPrice
      ? addDecimals(subtotal, calculateIndicativeTotal(unitPrice, line.quantity))
      : subtotal;
  }, "0.00");
  const allLinesReady = lines.every((line) => {
    const product = byId.get(line.menuItemId);
    const hasVariant = !line.variantId || product?.variants.some((item) => item.id === line.variantId);
    const hasAddOns = line.addOnIds.every((id) => product?.addOns.some((addOn) => addOn.id === id));
    return Boolean(product && hasVariant && hasAddOns);
  });
  const canProceed = availabilityReady && allLinesReady;
  const checkoutBlockedMessage = isError
    ? "We could not confirm live availability. Please retry before checkout."
    : availabilityReady
      ? "One or more saved customizations are no longer available. Review your cart before checkout."
      : "Checking live availability before checkout…";

  if (!hydrated) {
    return (
      <div className="space-y-3 pb-12" role="status" aria-live="polite">
        <p className="sr-only">Loading your saved cart</p>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse the menu and add something delicious. Your cart is saved on this device."
        action={
          <Link href="/menu">
            <Button type="button">Browse menu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <h1 className="font-heading text-h2 font-bold">Cart</h1>

      {isError && (
        <ErrorState
          message="We could not verify live menu availability. Your saved cart is still shown."
          onRetry={() => void refetch()}
        />
      )}

      <Card>
        <label className="block text-label font-medium">Order type</label>
        <div className="mt-2 flex gap-2">
          {ORDER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`rounded-full px-4 py-2 font-heading text-xs font-semibold transition-colors ${
                orderType === type
                  ? "bg-brand-red text-white"
                  : "bg-neutralTint text-charcoal hover:bg-blushTint hover:text-brand-red"
              }`}>
              {type.replace("_", " ")}
            </button>
          ))}
        </div>
        <p className="mt-2 text-caption text-mutedGray">
          Address is required only for DELIVERY. Prices are confirmed at checkout.
        </p>
      </Card>

      <div className="space-y-3">
        {lines.map((line) => {
          const key = lineKey(line);
          const product = byId.get(line.menuItemId);
          const variant = product?.variants.find((item) => item.id === line.variantId);
          const addOns = (line.addOnIds || [])
            .map((id) => product?.addOns.find((addOn) => addOn.id === id))
            .filter((addOn): addOn is NonNullable<typeof addOn> => Boolean(addOn));
          const addOnLabels = addOns.length > 0
            ? addOns.map((addOn) => addOn.label)
            : line.addOnLabels ?? [];
          const variantLabel = variant?.label ?? line.variantLabel;
          const customizationAvailable = Boolean(
            product &&
              (!line.variantId || variant) &&
              line.addOnIds.every((id) => product.addOns.some((addOn) => addOn.id === id))
          );
          const calculatedPrice = product && customizationAvailable
            ? calculateIndicativeUnitPrice(
                product.basePrice,
                variant?.priceDelta,
                addOns.map((addOn) => addOn.price)
              )
            : null;
          const savedPrice = line.displayPrice !== "0.00" ? line.displayPrice : null;
          const displayPrice = calculatedPrice ?? savedPrice;
          const lineTotal = displayPrice ? calculateIndicativeTotal(displayPrice, line.quantity) : null;
          const availabilityMessage = product
            ? customizationAvailable
              ? null
              : "This customization is no longer available and will be removed."
            : isPending
              ? "Checking live availability…"
              : isError
                ? "Live availability could not be checked; showing your saved details."
                : "This item is no longer available and will be removed.";

          return (
            <Card key={key} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-heading font-bold">{line.displayName}</h3>
                <p className="text-caption text-bodySecondary">
                  Variant: {variantLabel ?? "Standard"}
                </p>
                <p className="text-caption text-bodySecondary">
                  Add-ons: {addOnLabels.length > 0 ? addOnLabels.join(", ") : "None"}
                </p>
                {availabilityMessage && (
                  <p className="mt-1 text-caption text-mutedGray">{availabilityMessage}</p>
                )}
                <p className="mt-1 text-caption text-mutedGray">
                  {displayPrice
                    ? `Unit ${formatINR(displayPrice)}${lineTotal ? ` · Line total ${formatINR(lineTotal)}` : ""}`
                    : "Saved price unavailable until live availability is confirmed."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateQty(key, line.quantity - 1)}
                  aria-label={`Decrease ${line.displayName} quantity`}
                >
                  −
                </Button>
                <span className="w-6 text-center font-bold" aria-live="polite">
                  {line.quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateQty(key, line.quantity + 1)}
                  disabled={line.quantity >= 20}
                  aria-label={`Increase ${line.displayName} quantity`}
                >
                  +
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(key)}
                >
                  Remove
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <span className="text-body font-semibold">Indicative subtotal</span>
          <span className="font-heading text-h4 font-extrabold text-brand-red">
            {formatINR(indicativeSubtotal)}
          </span>
        </div>
        <p className="mt-2 text-caption text-mutedGray">
          An estimate based on your selected variants and add-ons. The server confirms the final total.
        </p>
      </Card>

      {!canProceed && (
        <p className="text-center text-caption text-mutedGray">{checkoutBlockedMessage}</p>
      )}
      {canProceed ? (
        <Link href="/checkout">
          <Button type="button" size="lg" className="w-full">
            Proceed to checkout
          </Button>
        </Link>
      ) : (
        <Button type="button" size="lg" className="w-full" disabled>
          Proceed to checkout
        </Button>
      )}
    </div>
  );
}