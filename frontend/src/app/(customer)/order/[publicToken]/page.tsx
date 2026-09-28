"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useInvoice, useOrder } from "@/lib/api/orders";
import {
  formatOrderTimestamp,
  isTerminalStatus,
  orderTypeLabel,
  paymentNote,
  statusHint,
  statusLabel,
} from "@/lib/order/status";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Customer order status + immediate post-purchase confirmation.
 *
 * This page is entered directly from `router.push` after `POST /orders`, so on
 * first render it IS the confirmation screen the sprint asks for. That is why
 * every fact the customer needs to trust the purchase — order number, order
 * type, items, totals, the timestamp, the pay-at-store note and the WhatsApp
 * line — is rendered from the single `OrderStatusResponse` and never depends on
 * the invoice request succeeding. Only the delivery address needs the invoice,
 * and that block degrades to a retry rather than disappearing.
 *
 * Lookup is by publicToken (a 24-byte random hex string), never orderNumber.
 * orderNumber is display-only and must not be used as a URL.
 */
export default function OrderPage() {
  const params = useParams<{ publicToken: string }>();
  const publicToken = params?.publicToken;
  const order = useOrder(publicToken);
  const invoice = useInvoice(publicToken);
  const { push } = useToast();
  const [linkCopied, setLinkCopied] = React.useState(false);

  const share = React.useCallback(async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "My Pokket Pizza order", url });
        return;
      } catch {
        // User dismissed the sheet, or the platform refused. Fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      push("Order link copied. Anyone with it can see this order.");
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      push("Could not copy the link. Copy it from your address bar instead.", "error");
    }
  }, [push]);

  if (order.isLoading) return <MenuSkeleton />;
  if (order.isError) {
    return (
      <ErrorState
        message="We could not find that order. Check the link, or open the order from your confirmation."
        onRetry={() => order.refetch()}
      />
    );
  }
  const o = order.data;
  if (!o) return null;

  const cancelled = o.status === "CANCELLED";
  const isDelivery = o.orderType === "DELIVERY";
  const live = !isTerminalStatus(o.status);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <p className="text-caption uppercase tracking-wide text-mutedGray">
          {cancelled ? "Order cancelled" : "Order placed"}
        </p>
        {/* The order number is the heading: it is the one fact a customer reads
            aloud over the phone, and it is what a shared link must show. */}
        <h1 className="text-h2 font-heading font-bold text-charcoal">{o.orderNumber}</h1>
        <p className="mt-1 text-body text-bodySecondary">
          {orderTypeLabel(o.orderType)} ·{" "}
          {formatOrderTimestamp(o.createdAt) || "just now"}
        </p>
      </div>

      <Card className={cancelled ? "border-brand-red" : undefined}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-bold text-charcoal">{statusLabel(o.status)}</h2>
          {live && (
            <span
              className="text-caption text-mutedGray"
              aria-live="polite"
              title="This page refreshes itself while your order is being prepared"
            >
              Updating…
            </span>
          )}
        </div>
        <p className="mt-1 text-body text-bodySecondary">{statusHint(o.status, o.orderType)}</p>
        {!cancelled && (
          <p className="mt-3 rounded-md bg-neutralTint px-4 py-3 text-body">
            <span className="font-semibold">{paymentNote(o.orderType)}</span>{" "}
            {isDelivery
              ? "Please keep the exact amount if you can — it helps the rider."
              : "We will have your order ready."}
          </p>
        )}
      </Card>

      {/* The sprint's promise. The backend sends this after the order commits and
          its failure never cancels the order, so it is safe to state here. */}
      {!cancelled && (
        <p className="flex items-start gap-2 text-body text-bodySecondary">
          <span aria-hidden="true">💬</span>
          <span>
            A WhatsApp confirmation with your order details is on its way to{" "}
            {invoice.data?.customer.phone ?? "your number"}.
          </span>
        </p>
      )}

      <Card>
        <h2 className="font-heading font-bold">Items</h2>
        <ul className="mt-3 space-y-2">
          {o.items.map((it, i) => (
            <li key={it.menuItemId || i} className="flex justify-between gap-4 text-body">
              <span className="min-w-0">
                <span className="font-semibold text-charcoal">{it.quantity}× </span>
                {it.nameSnapshot}
                {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                {it.addOnSnapshot.length > 0 &&
                  ` + ${it.addOnSnapshot.map((a) => a.label).join(", ")}`}
              </span>
              <span className="shrink-0 font-semibold">{formatINR(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t pt-3 text-body" aria-live="polite">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatINR(o.subtotal)}</dd>
          </div>
          {/* Delivery fee is a DELIVERY-only charge. The server sends "0.00"
              otherwise, so rendering it unconditionally printed a ₹0.00 row on
              every pickup and dine-in order. */}
          {isDelivery && (
            <div className="flex justify-between">
              <dt>Delivery fee</dt>
              <dd>{formatINR(o.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>{formatINR(o.tax)}</dd>
          </div>
          <div className="flex justify-between font-heading font-extrabold text-h4">
            <dt>Total</dt>
            <dd>{formatINR(o.total)}</dd>
          </div>
        </dl>
        {o.notes && (
          <p className="mt-3 text-caption text-bodySecondary">
            <span className="font-semibold">Your note:</span> {o.notes}
          </p>
        )}
      </Card>

      {isDelivery && (
        <Card>
          <h2 className="font-heading font-bold">Delivering to</h2>
          {invoice.data?.address ? (
            <address className="mt-2 text-body not-italic text-bodySecondary">
              {invoice.data.address.line1}
              {invoice.data.address.line2 ? `, ${invoice.data.address.line2}` : ""}
              {invoice.data.address.landmark ? ` (${invoice.data.address.landmark})` : ""}
              <br />
              {invoice.data.address.city} — {invoice.data.address.pincode}
            </address>
          ) : invoice.isError ? (
            <div className="mt-2">
              <p className="text-body text-bodySecondary">
                We could not load the delivery address.
              </p>
              <button
                type="button"
                onClick={() => invoice.refetch()}
                className="mt-1 text-caption font-bold text-brand-red underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <p className="mt-2 text-body text-bodySecondary">Loading your address…</p>
          )}
        </Card>
      )}

      <div className="space-y-2 print:hidden">
        <Link href={`/order/${publicToken}/invoice`}>
          <Button variant="outline" className="w-full">
            View invoice
          </Button>
        </Link>
        <Button variant="ghost" className="w-full" onClick={share}>
          {linkCopied ? "Link copied" : "Share this order"}
        </Button>
        <Link href="/menu" className="block text-center text-body text-brand-red underline">
          Order something else
        </Link>
      </div>
    </div>
  );
}
