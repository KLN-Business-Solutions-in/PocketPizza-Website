"use client";

import type { OrderType, QuoteItem, QuoteResponse } from "@shared/contract/contract";
import type { OrderQuote } from "@/hooks/useOrderQuote";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/LayoutPrimitives";

/**
 * Day 6 order summary. Every number here comes from POST /orders/quote — the
 * cart's indicative total is deliberately NOT shown, so there is only ever one
 * price on screen and it is the server's.
 *
 * Delivery fee is rendered only for DELIVERY (the server returns "0.00"
 * otherwise). The quote also re-runs on every order-type change, so switching
 * the pill updates this panel live.
 *
 * `override` is Day 7's pre-submit re-quote. When the price check finds the
 * server total has moved, the checkout page hands the *new* quote here so this
 * panel shows exactly the number the customer is about to be charged, instead of
 * the stale one. `quote.data` keeps driving everything else (line issues,
 * blocked state) because the override is only a price, not a re-validation.
 */
export function QuoteSummary({
  quote,
  orderType,
  override,
}: {
  quote: OrderQuote;
  orderType: OrderType;
  override?: QuoteResponse;
}) {
  const { data, isPending, bannerMessage, isBlocked, lineIssues, retry } = quote;
  const shown = override ?? data;
  const hasServerQuote = Boolean(shown);
  // Both totals are known to exist here, which the `!` assertions below would
  // otherwise have to spell out.
  const moved =
    override && data && override.total !== data.total
      ? { from: data.total, to: override.total }
      : null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading font-bold">Order summary</h2>
        {isPending && (
          <span className="text-caption text-mutedGray" aria-live="polite">
            Updating…
          </span>
        )}
      </div>

      {!hasServerQuote && !isPending && !bannerMessage && (
        <p className="mt-2 text-body text-bodySecondary">
          Waiting for the latest price from the server…
        </p>
      )}

      {/* Day 7. Announced, not silent: the customer must be told why the number
          moved and be given the chance to look at it before paying. */}
      {moved && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-brand-red bg-status-errorBg px-4 py-3"
        >
          <p className="text-body font-semibold text-brand-red">The price has changed.</p>
          <p className="mt-1 text-caption text-brand-red">
            It was {formatINR(moved.from)} and is now {formatINR(moved.to)}. Nothing has been
            charged. Check the figures below, then press Place order again to confirm the new total.
          </p>
        </div>
      )}

      {bannerMessage && (
        <div role="alert" className="mt-3 rounded-md border border-brand-red bg-status-errorBg px-4 py-3">
          <p className="text-body font-medium text-brand-red">{bannerMessage}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {isBlocked && lineIssues.size > 0 && (
        <div role="alert" className="mt-3 rounded-md border border-brand-red bg-status-errorBg px-4 py-3">
          <p className="text-body font-semibold text-brand-red">
            {lineIssues.size === 1
              ? "One item in your cart can no longer be ordered as configured."
              : `${lineIssues.size} items in your cart can no longer be ordered as configured.`}
          </p>
          <p className="mt-1 text-caption text-brand-red">
            {lineIssues.size === 1 ? "It is" : "They are"} highlighted below. Remove{" "}
            {lineIssues.size === 1 ? "it" : "them"} to continue.
          </p>
        </div>
      )}

      {shown && (
        <>
          <QuoteLineItems items={shown.items} />

          <dl className="mt-3 space-y-1 border-t pt-3 text-body">
            <Row label="Subtotal" value={formatINR(shown.subtotal)} />
            {orderType === "DELIVERY" && <Row label="Delivery fee" value={formatINR(shown.deliveryFee)} />}
            <Row label="Tax" value={formatINR(shown.tax)} />
            <div className="flex justify-between border-t pt-2 font-heading font-extrabold">
              <dt>Total</dt>
              <dd aria-live="polite">{formatINR(shown.total)}</dd>
            </div>
          </dl>
        </>
      )}

      <p className="mt-3 text-caption text-mutedGray">
        Priced by the server using the same engine that places your order — the cart page figures are
        indicative only. Prices in INR.
      </p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function QuoteLineItems({ items }: { items: QuoteItem[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex justify-between gap-3 text-caption text-bodySecondary">
          <span className="min-w-0">
            <span className="font-semibold text-charcoal">{it.quantity}× </span>
            {it.nameSnapshot}
            {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
            {it.addOnSnapshot.length > 0 && ` + ${it.addOnSnapshot.map((a) => a.label).join(", ")}`}
          </span>
          <span className="shrink-0 font-semibold text-charcoal">{formatINR(it.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}
