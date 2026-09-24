"use client";

import Link from "next/link";
import { useMenuFlat } from "@/lib/api/useMenu";
import { useCartStore } from "@/lib/cart/store";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/LayoutPrimitives";
import type { OrderType } from "@shared/contract/contract";

const ORDER_TYPES: OrderType[] = ["DELIVERY", "PICKUP", "DINE_IN"];

export default function CartPage() {
  const { products } = useMenuFlat();
  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);

  const byId = new Map(products.map((p) => [p.id, p]));

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
        <label className="block text-label font-medium">Order type</label>
        <div className="mt-2 flex gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`rounded-full px-4 py-2 text-xs font-heading font-semibold transition-colors ${
                orderType === t
                  ? "bg-brand-red text-white"
                  : "bg-neutralTint text-charcoal hover:bg-blushTint hover:text-brand-red"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
        <p className="mt-2 text-caption text-mutedGray">
          Address is required only for DELIVERY. Prices are confirmed at checkout.
        </p>
      </Card>

      <div className="space-y-3">
        {lines.map((l) => {
          const p = byId.get(l.menuItemId);
          const variant = p?.variants.find((v) => v.id === l.variantId);
          const addons = (l.addOnIds || [])
            .map((id) => p?.addOns.find((a) => a.id === id))
            .filter(Boolean);
          return (
            <Card key={l.key} className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold">{p?.name ?? l.menuItemId}</h3>
                {variant && <p className="text-caption text-bodySecondary">{variant.label}</p>}
                {addons.length > 0 && (
                  <p className="text-caption text-bodySecondary">
                    + {addons.map((a) => a!.label).join(", ")}
                  </p>
                )}
                {p && (
                  <p className="mt-1 text-caption text-mutedGray">
                    Base {formatINR(p.basePrice)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => updateQty(l.key, l.quantity - 1)}>
                  −
                </Button>
                <span className="w-6 text-center font-bold">{l.quantity}</span>
                <Button variant="outline" size="sm" onClick={() => updateQty(l.key, l.quantity + 1)}>
                  +
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeLine(l.key)}>
                  Remove
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Link href="/checkout">
        <Button size="lg" className="w-full">
          Proceed to Checkout
        </Button>
      </Link>
    </div>
  );
}
