"use client";

import type { OrderType, QuoteItem } from "@shared/contract/contract";
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
 */
export function QuoteSummary({
  quote,
  orderType,
}: {
  quote: OrderQuote;
  orderType: OrderType;
}) {
  const { data, isPending, bannerMessage, isBlocked, lineIssues, retry } = quote;
  const hasServerQuote = Boolean(data);

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

      {data && (
        <>
          <QuoteLineItems items={data.items} />

          <dl className="mt-3 space-y-1 border-t pt-3 text-body">
            <Row label="Subtotal" value={formatINR(data.subtotal)} />
            {orderType === "DELIVERY" && <Row label="Delivery fee" value={formatINR(data.deliveryFee)} />}
            <Row label="Tax" value={formatINR(data.tax)} />
            <div className="flex justify-between border-t pt-2 font-heading font-extrabold">
              <dt>Total</dt>
              <dd aria-live="polite">{formatINR(data.total)}</dd>
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
