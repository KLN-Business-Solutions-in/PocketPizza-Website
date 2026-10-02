"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ALLOWED_TRANSITIONS,
  useAdminOrderDetail,
  useUpdateOrderStatus,
} from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const order = useAdminOrderDetail(id);
  const updateStatus = useUpdateOrderStatus(id ?? "");

  if (order.isLoading) {
    return <p className="py-12 text-body text-bodySecondary">Loading order details…</p>;
  }

  if (order.isError || !order.data) {
    return (
      <div className="space-y-4 py-12">
        <ErrorState message="We could not find that order." onRetry={() => order.refetch()} />
        <Link href="/admin/dashboard" className="inline-block text-body text-brand-red underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const detail = order.data;
  const transitions = ALLOWED_TRANSITIONS[detail.status].filter((next) => {
    if (detail.status !== "READY") return true;
    if (next === "OUT_FOR_DELIVERY") return detail.orderType === "DELIVERY";
    if (next === "COMPLETED") return detail.orderType !== "DELIVERY";
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/dashboard" className="text-body text-brand-red underline">
            Back to dashboard
          </Link>
          <h1 className="mt-2 font-heading text-h2 font-bold">{detail.orderNumber}</h1>
          <p className="mt-1 text-body text-bodySecondary">{detail.createdAt}</p>
        </div>
        <span className="rounded-full bg-brand-red/10 px-3 py-1 text-caption font-bold text-brand-red">
          {detail.status.replaceAll("_", " ")}
        </span>
      </div>

      <Card>
        <h2 className="font-heading font-bold">Customer</h2>
        <p className="mt-2 text-body font-semibold">{detail.customer.name}</p>
        <p className="text-body text-bodySecondary">{detail.customer.phone}</p>
        <p className="mt-3 text-body">
          <span className="font-semibold">Order type:</span> {detail.orderType.replaceAll("_", " ")}
        </p>
        {detail.orderType === "DELIVERY" && detail.address && (
          <address className="mt-3 text-body not-italic text-bodySecondary">
            {detail.address.line1}
            {detail.address.line2 ? `, ${detail.address.line2}` : ""}
            {detail.address.landmark ? ` (${detail.address.landmark})` : ""}
            <br />
            {detail.address.city}, {detail.address.pincode}
          </address>
        )}
      </Card>

      <Card>
        <h2 className="font-heading font-bold">Items</h2>
        <ul className="mt-3 space-y-3">
          {detail.items.map((item, index) => (
            <li key={`${item.menuItemId}-${index}`} className="border-b border-gray-100 pb-3 last:border-0">
              <p className="text-body font-semibold">
                {item.quantity}× {item.nameSnapshot}
                {item.variantSnapshot ? ` (${item.variantSnapshot})` : ""}
              </p>
              {item.addOnSnapshot.length > 0 && (
                <p className="mt-1 text-caption text-bodySecondary">
                  Add-ons: {item.addOnSnapshot.map((addOn) => `${addOn.label} (${addOn.price})`).join(", ")}
                </p>
              )}
              <p className="mt-1 text-caption text-bodySecondary">
                Unit price: {item.unitPrice} · Line total: {item.lineTotal}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-heading font-bold">Totals</h2>
        <dl className="mt-3 space-y-2 text-body">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{detail.subtotal}</dd></div>
          <div className="flex justify-between"><dt>Delivery fee</dt><dd>{detail.deliveryFee}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{detail.tax}</dd></div>
          <div className="flex justify-between border-t pt-2 font-heading font-bold"><dt>Total</dt><dd>{detail.total}</dd></div>
        </dl>
      </Card>

      {transitions.length > 0 && (
        <Card>
          <h2 className="font-heading font-bold">Update status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {transitions.map((next) => (
              <Button
                key={next}
                onClick={() => updateStatus.mutate({ status: next })}
                disabled={updateStatus.isPending}
                isLoading={updateStatus.isPending}
              >
                {next.replaceAll("_", " ")}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
