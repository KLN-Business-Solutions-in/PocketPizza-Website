"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart/store";
import { newIdempotencyKey, quotePayload, useCreateOrder, useQuote } from "@/lib/api/orders";
import { normalizeIndianPhone } from "@/lib/phone";
import { formatINR } from "@/lib/money";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import type { CreateOrderRequest, OrderType } from "@shared/contract/contract";

const ORDER_TYPES: OrderType[] = ["DELIVERY", "PICKUP", "DINE_IN"];

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const clear = useCartStore((s) => s.clear);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [line1, setLine1] = React.useState("");
  const [line2, setLine2] = React.useState("");
  const [landmark, setLandmark] = React.useState("");
  const [city, setCity] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const quote = useQuote();
  const createOrder = useCreateOrder();
  // One idempotency key per checkout attempt (§19). Regenerated after success.
  const idempotencyRef = React.useRef<string>(newIdempotencyKey());

  const cartSignature = lines
    .map((line) => `${line.menuItemId}|${line.variantId ?? ""}|${line.addOnIds.join(",")}:${line.quantity}`)
    .join(";");

  React.useEffect(() => {
    if (lines.length === 0) return;
    quote.reset();
    quote.mutate(quotePayload(orderType, lines));
    // Re-run when any line's options or quantity changes, not just line count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature, orderType]);

  const refreshQuote = () => {
    setFormError(null);
    quote.reset();
    if (lines.length > 0) quote.mutate(quotePayload(orderType, lines));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (lines.length === 0) {
      setFormError("Your cart is empty.");
      return;
    }
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeIndianPhone(phone);
    } catch (err) {
      setFormError((err as Error).message);
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (orderType === "DELIVERY" && (!line1.trim() || !city.trim() || !pincode.trim())) {
      setFormError("Address line 1, city and pincode are required for delivery.");
      return;
    }

    // Display snapshots stay client-side; the server receives IDs/options only
    // and recomputes the authoritative price.
    const body: CreateOrderRequest = {
      orderType,
      items: lines.map((l) => ({
        menuItemId: l.menuItemId,
        variantId: l.variantId,
        addOnIds: l.addOnIds ?? [],
        quantity: l.quantity,
      })),
      customer: { name: name.trim(), phone: normalizedPhone },
      ...(orderType === "DELIVERY"
        ? {
            address: {
              line1: line1.trim(),
              line2: line2.trim() || undefined,
              landmark: landmark.trim() || undefined,
              city: city.trim(),
              pincode: pincode.trim(),
            },
          }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      idempotencyKey: idempotencyRef.current,
    };

    try {
      const res = await createOrder.mutateAsync(body);
      clear();
      idempotencyRef.current = newIdempotencyKey();
      // Public lookup uses publicToken, never orderNumber (§11.5, §16.13).
      router.push(`/order/${res.publicToken}`);
    } catch (err) {
      const api = err as ApiError;
      if (api?.code === "ORDER_INVALID") {
        const details = Array.isArray(api.details) ? api.details.join(" ") : "";
        setFormError(`${api.message} ${details}`.trim());
      } else {
        setFormError(api?.message || "Failed to place order. Please try again.");
      }
    }
  };

  if (lines.length === 0) {
    return (
      <div className="pb-12">
        <h1 className="text-h2 font-heading font-bold">Checkout</h1>
        <p className="mt-2 text-body text-bodySecondary">
          Your cart is empty. Add items from the menu first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-h2 font-heading font-bold">Checkout</h1>

      <Card>
        <label className="block text-label font-medium">Order type</label>
        <div className="mt-2 flex gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`rounded-full px-4 py-2 text-xs font-heading font-semibold ${
                orderType === t ? "bg-brand-red text-white" : "bg-neutralTint text-charcoal"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold">Price summary (from server)</h2>
          <button onClick={refreshQuote} className="text-caption font-bold text-brand-red underline">
            Refresh quote
          </button>
        </div>
        {quote.isPending && <p className="mt-2 text-body text-bodySecondary">Calculating…</p>}
        {quote.isError && (
          <div className="mt-2">
            <ErrorState
              message={(quote.error as Error)?.message || "Quote failed."}
              onRetry={refreshQuote}
            />
          </div>
        )}
        {quote.data && (
          <dl className="mt-2 space-y-1 text-body">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-semibold">{formatINR(quote.data.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery fee</dt>
              <dd className="font-semibold">{formatINR(quote.data.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd className="font-semibold">{formatINR(quote.data.tax)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-heading font-extrabold">
              <dt>Total</dt>
              <dd>{formatINR(quote.data.total)}</dd>
            </div>
          </dl>
        )}
        <p className="mt-2 text-caption text-mutedGray">
          Server recomputes all prices — the quote uses the same engine as order creation.
        </p>
      </Card>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <h2 className="font-heading font-bold">Contact</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anjali" required />
            <Input label="Phone (10-digit Indian mobile)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" required />
          </div>
        </Card>

        {orderType === "DELIVERY" && (
          <Card>
            <h2 className="font-heading font-bold">Delivery address</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input label="Line 1 *" value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Flat 203" />
              <Input label="Line 2" value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="ABC Society" />
              <Input label="Landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near Park" />
              <Input label="City *" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Pune" />
              <Input label="Pincode *" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="411001" />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-heading font-bold">Notes (optional)</h2>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy" maxLength={500} />
        </Card>

        {formError && <ErrorState message={formError} />}

        <Button type="submit" size="lg" className="w-full" isLoading={createOrder.isPending}>
          Place Order · {quote.data ? formatINR(quote.data.total) : "—"}
        </Button>
        <p className="text-caption text-mutedGray">
          Pay at store. WhatsApp confirmation follows — its failure never cancels your order.
        </p>
      </form>
    </div>
  );
}