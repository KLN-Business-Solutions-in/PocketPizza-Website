"use client";

import Link from "next/link";
import { useMenuFlat } from "@/lib/api/useMenu";
import { useCartHydrated, useCartStore, MAX_CART_LINES } from "@/lib/cart/store";
import { formatINR, fromPaise, toPaise } from "@/lib/money";
import { useCartReconcile } from "@/hooks/useCartReconcile";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Skeleton } from "@/components/ui/LayoutPrimitives";
import { OrderTypeSelector } from "@/components/cart/OrderTypeSelector";
import { CartLineRow } from "@/components/cart/CartLineRow";

export default function CartPage() {
  const hasHydrated = useCartHydrated();
  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);

  // Day 4: evict any line whose item is no longer active, with a toast.
  useCartReconcile();

  // `useMenuFlat()` is still fetched: the page shows a loading state while the
  // active-item reconciliation is deciding whether your cart is still valid.
  const { isLoading } = useMenuFlat();

  // Day 4 indicative subtotal. Display-only — the server re-prices on Day 6.
  // Accumulated in integer paise; never float, never string concatenation.
  const indicativeSubtotal = fromPaise(
    lines.reduce((total, l) => total + toPaise(l.displayPrice) * l.quantity, 0)
  );

  if (!hasHydrated || isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <h1 className="text-h2 font-heading font-bold">Cart</h1>
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-24 w-full rounded-md" />
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
            <Button>Browse menu</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-h2 font-heading font-bold">Cart</h1>

      <Card>
        <p className="mb-2 block text-label font-medium">Order type</p>
        <OrderTypeSelector value={orderType} onChange={setOrderType} idPrefix="cart-order-type" />
      </Card>

      <ul className="space-y-3">
        {lines.map((l, i) => (
          <CartLineRow
            key={l.key}
            line={l}
            index={i}
            onUpdateQty={updateQty}
            onRemove={removeLine}
          />
        ))}
      </ul>

      <Card>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-heading font-bold">Indicative subtotal</p>
            <p className="text-caption text-mutedGray">
              {lines.length} {lines.length === 1 ? "line" : "lines"} ·{" "}
              {lines.reduce((n, l) => n + l.quantity, 0)} items
            </p>
          </div>
          <p className="font-heading font-extrabold text-h4 text-charcoal">
            {formatINR(indicativeSubtotal)}
          </p>
        </div>
        <p className="mt-3 text-caption text-mutedGray">
          Indicative only. Delivery fee and tax are added by the server at checkout, which is the
          price you actually pay.
        </p>
        {lines.length >= MAX_CART_LINES && (
          <p role="status" className="mt-2 text-caption font-medium text-brand-red">
            This is the maximum number of separate items we can order in one order. Remove a line to
            add another.
          </p>
        )}
      </Card>

      <Link href="/checkout">
        <Button size="lg" className="w-full">
          Proceed to Checkout
        </Button>
      </Link>
    </div>
  );
}
