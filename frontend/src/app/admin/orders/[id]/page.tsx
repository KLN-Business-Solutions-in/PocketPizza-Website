"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  useAdminOrderDetail,
  useUpdateOrderStatus,
} from "@/lib/api/admin";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { getOrderTransitions, OrderActionButton } from "@/components/admin/OrderActionButton";

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={<p className="py-12 text-body text-bodySecondary">Loading order details…</p>}>
      <AdminOrderDetailContent />
    </Suspense>
  );
}

function AdminOrderDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const fromHistory = searchParams.get("from") === "history";
  const backHref = fromHistory ? "/admin/orders/history" : "/admin/dashboard";
  const backLabel = fromHistory ? "Back to order history" : "Back to dashboard";
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
        <Link href={backHref} className="inline-block text-body text-brand-red underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  const detail = order.data;
  const transitions = getOrderTransitions(detail.status, detail.orderType);
  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <Link href={backHref} className="text-body text-brand-red underline">
            {backLabel}
          </Link>
          <h1 className="mt-2 break-all font-heading text-h2 font-bold">{detail.orderNumber}</h1>
          <p className="mt-1 break-words text-body text-bodySecondary">{detail.createdAt}</p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-brand-red/10 px-3 py-1 text-caption font-bold text-brand-red">
          {detail.status.replaceAll("_", " ")}
        </span>
      </div>

      <Card className="min-w-0 p-4 sm:p-6">
        <h2 className="font-heading font-bold">Customer</h2>
        <p className="mt-2 break-words text-body font-semibold">{detail.customer.name}</p>
        <p className="break-words text-body text-bodySecondary">{detail.customer.phone}</p>
        <p className="mt-3 text-body">
          <span className="font-semibold">Order type:</span> {detail.orderType.replaceAll("_", " ")}
        </p>
        {detail.orderType === "DELIVERY" && detail.address && (
          <address className="mt-3 break-words text-body not-italic text-bodySecondary">
            {detail.address.line1}
            {detail.address.line2 ? `, ${detail.address.line2}` : ""}
            {detail.address.landmark ? ` (${detail.address.landmark})` : ""}
            <br />
            {detail.address.city}, {detail.address.pincode}
          </address>
        )}
      </Card>

      <Card className="min-w-0 p-4 sm:p-6">
        <h2 className="font-heading font-bold">Items</h2>
        <ul className="mt-3 space-y-3">
          {detail.items.map((item, index) => (
            <li key={`${item.menuItemId}-${index}`} className="break-words border-b border-border-default pb-3 last:border-0">
              <p className="break-words text-body font-semibold">
                {item.quantity}× {item.nameSnapshot}
                {item.variantSnapshot ? ` (${item.variantSnapshot})` : ""}
              </p>
              {item.addOnSnapshot.length > 0 && (
                <p className="mt-1 break-words text-caption text-bodySecondary">
                  Add-ons: {item.addOnSnapshot.map((addOn) => `${addOn.label} (${addOn.price})`).join(", ")}
                </p>
              )}
              <p className="mt-1 break-words text-caption text-bodySecondary">
                Unit price: {item.unitPrice} · Line total: {item.lineTotal}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="min-w-0 p-4 sm:p-6">
        <h2 className="font-heading font-bold">Totals</h2>
        <dl className="mt-3 space-y-2 text-body">
          <div className="flex flex-wrap justify-between gap-x-3"><dt>Subtotal</dt><dd className="break-all">{detail.subtotal}</dd></div>
          <div className="flex flex-wrap justify-between gap-x-3"><dt>Delivery fee</dt><dd className="break-all">{detail.deliveryFee}</dd></div>
          <div className="flex flex-wrap justify-between gap-x-3"><dt>Tax</dt><dd className="break-all">{detail.tax}</dd></div>
          <div className="flex flex-wrap justify-between gap-x-3 border-t border-border-default pt-2 font-heading font-bold"><dt>Total</dt><dd className="break-all">{detail.total}</dd></div>
        </dl>
      </Card>

      {transitions.length > 0 && (
        <Card className="min-w-0 p-4 sm:p-6">
          <h2 className="font-heading font-bold">Update status</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {transitions.map((next) => (
              <OrderActionButton
                key={next}
                status={next}
                onClick={() => updateStatus.mutate({ status: next })}
                disabled={updateStatus.isPending}
                isLoading={updateStatus.isPending}
                className="sm:w-auto"
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
