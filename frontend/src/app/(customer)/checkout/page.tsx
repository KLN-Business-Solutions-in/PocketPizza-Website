"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { OrderType } from "@shared/contract/contract";

import { useCartHydrated, useCartStore } from "@/lib/cart/store";
import { newIdempotencyKey, quotePayload, useCreateOrder } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { formatINR } from "@/lib/money";
import {
  checkoutSchema,
  toCreateOrderRequest,
  type CheckoutInput,
  type CheckoutValues,
} from "@/lib/checkout/schema";
import { parseQuoteRejections } from "@/lib/quote/rejections";
import { useCartReconcile } from "@/hooks/useCartReconcile";
import { useOrderQuote } from "@/hooks/useOrderQuote";

import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { OrderTypeSelector } from "@/components/cart/OrderTypeSelector";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { NumericField, TextField } from "@/components/form/TextField";
import { QuoteSummary } from "@/components/quote/QuoteSummary";

/**
 * Day 5 + Day 6 checkout.
 *
 * Day 5 — the form is react-hook-form driven by the Zod schema in
 * `src/lib/checkout/schema.ts`, which layers the two rules the sprint needs
 * (10-digit Indian mobile, address required if and only if DELIVERY) on top of
 * the FROZEN shared contract. Errors render inline per field and submit stays
 * disabled while the form is invalid.
 *
 * Day 6 — every price on screen comes from POST /orders/quote; the client sends
 * ids and quantities only. A rejected quote marks the offending line and blocks
 * submission until the cart is fixed.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const hasHydrated = useCartHydrated();
  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);

  useCartReconcile();
  const quote = useOrderQuote();
  const createOrder = useCreateOrder();

  // One idempotency key per checkout attempt (§19). Held as state rather than
  // a ref: it must survive repeated failed submits unchanged, and only be
  // regenerated once the order actually succeeds.
  const [idempotencyKey, setIdempotencyKey] = React.useState(newIdempotencyKey);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CheckoutInput, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onChange",
    defaultValues: {
      orderType,
      customer: { name: "", phone: "" },
      items: [],
      notes: "",
    },
  });

  const changeOrderType = (next: OrderType) => {
    setOrderType(next);
    setValue("orderType", next, { shouldValidate: true, shouldDirty: true });
    setSubmitError(null);
  };

  // `items` is required by the shared schema but is not a user input — it comes
  // from the cart. Push it into the form whenever the cart changes so the
  // resolver (and therefore isValid) always sees a complete payload.
  // Reuses quotePayload so the form, the quote request and the create-order
  // body are all built from one function.
  const cartItems = React.useMemo(() => quotePayload(orderType, lines).items, [orderType, lines]);
  const itemsSignature = React.useMemo(() => JSON.stringify(cartItems), [cartItems]);

  React.useEffect(() => {
    if (cartItems.length === 0) return;
    setValue("items", cartItems, { shouldValidate: true });
  }, [itemsSignature, cartItems, setValue]);

  // The cart owns the order type (the cart page sets it too), so push the
  // store's value into the form whenever it changes. Unidirectional — the form
  // never writes back, so the two can never disagree.
  React.useEffect(() => {
    setValue("orderType", orderType, { shouldValidate: true });
  }, [orderType, setValue]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    if (lines.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }
    // Day 6: never submit against an unresolved quote.
    if (quote.isBlocked) {
      setSubmitError("Fix the highlighted items in your cart before placing this order.");
      return;
    }
    if (!quote.data) {
      setSubmitError("We could not confirm the price yet. Please wait a moment and try again.");
      return;
    }

    try {
      const body = toCreateOrderRequest({
        ...values,
        items: cartItems,
        idempotencyKey,
      });
      const res = await createOrder.mutateAsync(body);
      clear();
      setIdempotencyKey(newIdempotencyKey());
      // Public lookup uses publicToken, never orderNumber (§11.5, §16.13).
      router.push(`/order/${res.publicToken}`);
    } catch (err) {
      // Handles the backend's per-line `items[N]: …` details as well as plain
      // 4xx/5xx messages.
      const reasons = parseQuoteRejections(err).map((i) => i.reason);
      setSubmitError(
        err instanceof ApiError
          ? reasons.join(" ") || err.message
          : "Failed to place order. Please try again."
      );
    }
  });

  if (!hasHydrated) {
    return <p className="text-body text-bodySecondary">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="pb-12">
        <h1 className="text-h2 font-heading font-bold">Checkout</h1>
        <p className="mt-2 text-body text-bodySecondary">
          Your cart is empty. Add items from the menu first.
        </p>
        <Link href="/menu" className="mt-4 inline-block">
          <Button variant="outline">Browse the menu</Button>
        </Link>
      </div>
    );
  }

  const submitDisabled =
    isSubmitting ||
    createOrder.isPending ||
    !isValid ||
    quote.isPending ||
    !quote.data ||
    quote.isBlocked;

  return (
    <div className="space-y-6 pb-12">
      <h1 className="text-h2 font-heading font-bold">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <form onSubmit={submit} noValidate className="space-y-4">
          <Card>
            <p className="mb-2 block text-label font-medium">Order type</p>
            <OrderTypeSelector
              value={orderType}
              onChange={changeOrderType}
              idPrefix="checkout-order-type"
            />
          </Card>

          <Card>
            <h2 className="font-heading font-bold">Your items</h2>
            <ul className="mt-3 space-y-3">
              {lines.map((l, i) => (
                <CartLineRow
                  key={l.key}
                  line={l}
                  index={i}
                  onUpdateQty={updateQty}
                  onRemove={(key) => {
                    removeLine(key);
                    setSubmitError(null);
                  }}
                  issue={quote.lineIssues.get(i)}
                />
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-heading font-bold">Contact</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TextField
                label="Name"
                autoComplete="name"
                placeholder="Anjali"
                error={errors.customer?.name?.message}
                {...register("customer.name")}
              />
              <NumericField
                label="Mobile number"
                type="tel"
                inputMode="numeric"
                maxLength={15}
                autoComplete="tel"
                placeholder="9876543210"
                hint="10-digit Indian mobile number"
                error={errors.customer?.phone?.message}
                {...register("customer.phone")}
              />
            </div>
          </Card>

          {orderType === "DELIVERY" && (
            <Card>
              <h2 className="font-heading font-bold">Delivery address</h2>
              {errors.address?.message && (
                <p role="alert" className="mt-2 text-caption text-brand-red">
                  {errors.address.message}
                </p>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextField
                  label="Address line 1"
                  autoComplete="address-line1"
                  placeholder="Flat 203, Sai Residency"
                  error={errors.address?.line1?.message}
                  {...register("address.line1")}
                />
                <TextField
                  label="Address line 2"
                  autoComplete="address-line2"
                  placeholder="ABC Society"
                  error={errors.address?.line2?.message}
                  {...register("address.line2")}
                />
                <TextField
                  label="Landmark"
                  placeholder="Near Park"
                  error={errors.address?.landmark?.message}
                  {...register("address.landmark")}
                />
                <TextField
                  label="City"
                  autoComplete="address-level2"
                  placeholder="Pune"
                  error={errors.address?.city?.message}
                  {...register("address.city")}
                />
                <NumericField
                  label="Pincode"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="postal-code"
                  placeholder="411001"
                  error={errors.address?.pincode?.message}
                  {...register("address.pincode")}
                />
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-heading font-bold">Anything else?</h2>
            <div className="mt-3">
              <TextField
                label="Order notes (optional)"
                placeholder="Less spicy, extra napkins"
                maxLength={500}
                error={errors.notes?.message}
                {...register("notes")}
              />
            </div>
          </Card>

          {submitError && <ErrorState message={submitError} />}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitDisabled}
            isLoading={isSubmitting || createOrder.isPending}
          >
            {quote.isBlocked
              ? "Fix your cart to continue"
              : quote.data
                ? `Place Order · ${formatINR(quote.data.total)}`
                : "Place Order"}
          </Button>
          <p className="text-caption text-mutedGray">
            Pay at store. WhatsApp confirmation follows — its failure never cancels your order.
          </p>
        </form>

        <div className="lg:sticky lg:top-20">
          <QuoteSummary quote={quote} orderType={orderType} />
        </div>
      </div>
    </div>
  );
}
