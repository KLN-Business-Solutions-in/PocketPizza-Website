"use client";

import { useParams } from "next/navigation";
import { useInvoice } from "@/lib/api/orders";
import { formatINR } from "@/lib/money";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";

/**
 * Customer invoice — Backend Master Reference §11.6.
 * GET /api/v1/orders/:publicToken/invoice
 */
export default function OrderInvoicePage() {
  const params = useParams<{ publicToken: string }>();
  const invoice = useInvoice(params?.publicToken);

  if (invoice.isLoading) return <MenuSkeleton />;
  if (invoice.isError) {
    return (
      <ErrorState
        message={(invoice.error as Error)?.message || "Invoice not found."}
        onRetry={() => invoice.refetch()}
      />
    );
  }
  const inv = invoice.data;
  if (!inv) return null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h2 font-heading font-bold">Invoice</h1>
        <p className="text-body text-bodySecondary">
          Order {inv.orderNumber} · {new Date(inv.createdAt).toLocaleString("en-IN")}
        </p>
      </div>
      <Card>
        <p className="font-heading font-bold">{inv.customer.name}</p>
        <p className="text-body text-bodySecondary">{inv.customer.phone}</p>
        {inv.address && (
          <p className="mt-1 text-body text-bodySecondary">
            {inv.address.line1}
            {inv.address.line2 ? `, ${inv.address.line2}` : ""}
            {inv.address.landmark ? ` (${inv.address.landmark})` : ""}, {inv.address.city} —{" "}
            {inv.address.pincode}
          </p>
        )}
      </Card>
      <Card>
        <table className="w-full text-body">
          <thead>
            <tr className="text-left text-caption text-mutedGray">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Unit</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="py-2">
                  {it.nameSnapshot}
                  {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                  {it.addOnSnapshot.length > 0 && (
                    <span className="block text-caption text-mutedGray">
                      + {it.addOnSnapshot.map((a) => a.label).join(", ")}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right">{formatINR(it.unitPrice)}</td>
                <td className="py-2 text-right font-semibold">{formatINR(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1 border-t pt-3 text-body">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatINR(inv.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{formatINR(inv.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd>{formatINR(inv.tax)}</dd>
          </div>
          <div className="flex justify-between font-heading font-extrabold text-h4">
            <dt>Grand total</dt>
            <dd>{formatINR(inv.total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-caption text-mutedGray">
          Payment: {inv.paymentMethod} · Status: {inv.status}
        </p>
      </Card>
      <button onClick={() => window.print()} className="underline text-brand-red text-body">
        Print invoice
      </button>
    </div>
  );
}
