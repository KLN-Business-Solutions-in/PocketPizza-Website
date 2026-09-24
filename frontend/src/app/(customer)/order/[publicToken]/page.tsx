"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useInvoice, useOrder } from "@/lib/api/orders";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";

/**
 * Customer order status — Backend Master Reference §11.5.
 * Lookup by publicToken (cuid). orderNumber is display-only.
 */
export default function OrderPage() {
  const params = useParams<{ publicToken: string }>();
  const publicToken = params?.publicToken;
  const order = useOrder(publicToken);
  const invoice = useInvoice(publicToken);

  if (order.isLoading) return <MenuSkeleton />;
  if (order.isError) {
    return (
      <ErrorState
        message={(order.error as Error)?.message || "Order not found."}
        onRetry={() => order.refetch()}
      />
    );
  }
  const o = order.data;
  if (!o) return null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h2 font-heading font-bold">Order {o.orderNumber}</h1>
        <p className="mt-1 text-body text-bodySecondary">
          Status: <span className="font-bold text-charcoal">{o.status.replaceAll("_", " ")}</span> ·{" "}
          {o.orderType.replaceAll("_", " ")}
        </p>
      </div>

      <Card>
        <h2 className="font-heading font-bold">Items</h2>
        <ul className="mt-2 space-y-2">
          {o.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-4 text-body">
              <span>
                {it.quantity}× {it.nameSnapshot}
                {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                {it.addOnSnapshot.length > 0 &&
                  ` + ${it.addOnSnapshot.map((a) => a.label).join(", ")}`}
              </span>
              <span className="font-semibold">{formatINR(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t pt-3 text-body">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatINR(o.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{formatINR(o.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>{formatINR(o.tax)}</dd>
          </div>
          <div className="flex justify-between font-heading font-extrabold">
            <dt>Total</dt>
            <dd>{formatINR(o.total)}</dd>
          </div>
        </dl>
      </Card>

      {invoice.data && (
        <Card>
          <h2 className="font-heading font-bold">Delivery details</h2>
          <p className="mt-1 text-body">
            {invoice.data.customer.name} · {invoice.data.customer.phone}
          </p>
          {invoice.data.address && (
            <p className="text-body text-bodySecondary">
              {invoice.data.address.line1}, {invoice.data.address.city} —{" "}
              {invoice.data.address.pincode}
            </p>
          )}
          <p className="text-caption text-mutedGray">Pay at store ({invoice.data.paymentMethod})</p>
        </Card>
      )}

      <Link href={`/order/${publicToken}/invoice`}>
        <Button variant="outline" className="w-full">
          View Invoice
        </Button>
      </Link>
    </div>
  );
}
