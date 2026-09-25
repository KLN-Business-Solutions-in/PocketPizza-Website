"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCartStore, type CartLine } from "@/lib/cart/store";
import { newIdempotencyKey, quotePayload, useCreateOrder, useQuote } from "@/lib/api/orders";
import { formatINR } from "@/lib/money";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";
import {
  createOrderRequestSchema,
  type CreateOrderRequest,
  type OrderType,
} from "@shared/contract/contract";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "DELIVERY", label: "Delivery" },
  { value: "PICKUP", label: "Pickup" },
  { value: "DINE_IN", label: "Dine-in" },
];

type CheckoutFormInput = z.input<typeof createOrderRequestSchema>;
type CheckoutFormOutput = z.output<typeof createOrderRequestSchema>;

function orderItems(lines: CartLine[]): CheckoutFormOutput["items"] {
  return lines.map((line) => ({
    menuItemId: line.menuItemId,
    variantId: line.variantId,
    addOnIds: line.addOnIds ?? [],
    quantity: line.quantity,
  }));
}

type SignatureItem = {
  menuItemId: string;
  variantId?: string;
  addOnIds?: string[];
  quantity: number;
};

function signatureForItems(items: SignatureItem[]): string {
  return items
    .map((item) => `${item.menuItemId}|${item.variantId ?? ""}|${(item.addOnIds ?? []).join(",")}:${item.quantity}`)
    .join(";");
}

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const storedOrderType = useCartStore((state) => state.orderType);
  const setOrderType = useCartStore((state) => state.setOrderType);
  const clear = useCartStore((state) => state.clear);

  const formItems = React.useMemo(() => orderItems(lines), [lines]);
  const cartSignature = signatureForItems(lines);
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => newIdempotencyKey());

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { dirtyFields, errors, isSubmitting, isValid },
  } = useForm<CheckoutFormInput, unknown, CheckoutFormOutput>({
    resolver: zodResolver(createOrderRequestSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: true,
    defaultValues: {
      orderType: storedOrderType,
      items: formItems,
      customer: { name: "", phone: "" },
      notes: "",
      idempotencyKey: idempotencyKey,
    },
  });

  const selectedOrderType = useWatch({ control, name: "orderType" });
  const activeOrderType = selectedOrderType ?? storedOrderType;
  const quote = useQuote();
  const createOrder = useCreateOrder();
  const [formError, setFormError] = React.useState<string | null>(null);
  const quoteSignature = quote.variables ? signatureForItems(quote.variables.items) : "";
  const quoteReady =
    quote.isSuccess &&
    quote.data !== undefined &&
    quote.variables?.orderType === activeOrderType &&
    quoteSignature === cartSignature;

  React.useEffect(() => {
    if (!dirtyFields.orderType && selectedOrderType !== storedOrderType) {
      setValue("orderType", storedOrderType, { shouldValidate: true });
    }
  }, [dirtyFields.orderType, selectedOrderType, setValue, storedOrderType]);

  React.useEffect(() => {
    setValue("items", formItems, { shouldValidate: true });
  }, [formItems, setValue]);

  React.useEffect(() => {
    if (formItems.length === 0) {
      quote.reset();
      return;
    }

    quote.reset();
    quote.mutate(quotePayload(activeOrderType, lines));
    // Re-run when any line's options or quantity changes, not just line count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature, activeOrderType]);

  const refreshQuote = () => {
    setFormError(null);
    quote.reset();
    if (formItems.length > 0) quote.mutate(quotePayload(activeOrderType, lines));
  };

  const selectOrderType = (nextType: OrderType) => {
    setOrderType(nextType);
    setValue("orderType", nextType, { shouldDirty: true, shouldValidate: true });
    if (nextType !== "DELIVERY") {
      setValue("address", undefined, { shouldDirty: true, shouldValidate: true });
    }
  };

  const submit = handleSubmit(async (values) => {
    setFormError(null);

    if (formItems.length === 0) {
      setFormError("Your cart is empty.");
      return;
    }

    // Display snapshots stay client-side; the server receives IDs/options only
    // and recomputes the authoritative price.
    const body: CreateOrderRequest = {
      orderType: values.orderType,
      items: formItems,
      customer: values.customer,
      ...(values.orderType === "DELIVERY" && values.address
        ? { address: values.address }
        : {}),
      ...(values.notes ? { notes: values.notes } : {}),
      idempotencyKey: idempotencyKey,
    };

    try {
      const res = await createOrder.mutateAsync(body);
      clear();
      setIdempotencyKey(newIdempotencyKey());
      // Public lookup uses publicToken, never orderNumber (§11.5, §16.13).
      router.push(`/order/${res.publicToken}`);
    } catch (err) {
      const api = err as ApiError;
      if (api?.code === "ORDER_INVALID") {
        const details = Array.isArray(api.details) ? api.details.join(" ") : "";
        refreshQuote();
        setFormError(`${api.message} ${details}`.trim());
      } else {
        setFormError(api?.message || "Failed to place order. Please try again.");
      }
    }
  });

  if (!hydrated) {
    return (
      <div className="space-y-4 pb-12" role="status" aria-live="polite">
        <p className="sr-only">Loading your saved cart</p>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
        <fieldset>
          <legend className="text-label font-medium">Order type</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Order type">
            {ORDER_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={activeOrderType === value}
                onClick={() => selectOrderType(value)}
                className={`rounded-full px-4 py-2 text-xs font-heading font-semibold ${
                  activeOrderType === value
                    ? "bg-brand-red text-white"
                    : "bg-neutralTint text-charcoal hover:bg-blushTint hover:text-brand-red"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        {errors.orderType?.message && (
          <p className="mt-2 text-caption text-brand-red" role="alert">
            {errors.orderType.message}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-bold">Price summary (from server)</h2>
          <button
            type="button"
            onClick={refreshQuote}
            className="text-caption font-bold text-brand-red underline"
          >
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

      <form onSubmit={submit} noValidate className="space-y-4">
        <Card>
          <h2 className="font-heading font-bold">Contact details</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input
              id="checkout-name"
              label="Name"
              autoComplete="name"
              placeholder="Anjali"
              required
              {...register("customer.name")}
              error={errors.customer?.name?.message}
              aria-invalid={Boolean(errors.customer?.name)}
            />
            <Input
              id="checkout-phone"
              label="Phone (10-digit Indian mobile)"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              autoComplete="tel-national"
              placeholder="9876543210"
              required
              {...register("customer.phone")}
              error={errors.customer?.phone?.message}
              aria-invalid={Boolean(errors.customer?.phone)}
            />
          </div>
        </Card>

        {activeOrderType === "DELIVERY" && (
          <Card>
            <h2 className="font-heading font-bold">Delivery address</h2>
            {errors.address?.message && (
              <p className="mt-2 text-caption text-brand-red" role="alert">
                {errors.address.message}
              </p>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input
                id="checkout-line1"
                label="Address line 1"
                autoComplete="address-line1"
                placeholder="Flat 203"
                required
                {...register("address.line1")}
                error={errors.address?.line1?.message}
                aria-invalid={Boolean(errors.address?.line1)}
              />
              <Input
                id="checkout-line2"
                label="Address line 2 (optional)"
                autoComplete="address-line2"
                placeholder="ABC Society"
                {...register("address.line2")}
                error={errors.address?.line2?.message}
              />
              <Input
                id="checkout-landmark"
                label="Landmark (optional)"
                autoComplete="address-line3"
                placeholder="Near Park"
                {...register("address.landmark")}
                error={errors.address?.landmark?.message}
              />
              <Input
                id="checkout-city"
                label="City"
                autoComplete="address-level2"
                placeholder="Pune"
                required
                {...register("address.city")}
                error={errors.address?.city?.message}
                aria-invalid={Boolean(errors.address?.city)}
              />
              <Input
                id="checkout-pincode"
                label="Pincode"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="postal-code"
                placeholder="411001"
                required
                {...register("address.pincode")}
                error={errors.address?.pincode?.message}
                aria-invalid={Boolean(errors.address?.pincode)}
              />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-heading font-bold">Order notes (optional)</h2>
          <Input
            id="checkout-notes"
            label="Notes"
            placeholder="Less spicy"
            maxLength={500}
            {...register("notes")}
            error={errors.notes?.message}
          />
        </Card>

        {formError && <ErrorState message={formError} />}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!isValid || !quoteReady || formItems.length === 0}
          isLoading={isSubmitting || createOrder.isPending}
        >
          Place order · {quote.data ? formatINR(quote.data.total) : "—"}
        </Button>
        {!quoteReady && (
          <p className="text-center text-caption text-mutedGray">
            Waiting for a current server quote before placing the order.
          </p>
        )}
        <p className="text-caption text-mutedGray">
          Pay at store. WhatsApp confirmation follows — its failure never cancels your order.
        </p>
      </form>
    </div>
  );
}
