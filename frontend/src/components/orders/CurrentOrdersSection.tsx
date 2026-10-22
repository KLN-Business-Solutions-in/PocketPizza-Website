"use client";

import Link from "next/link";
import { useCurrentOrders, type CurrentOrder } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { useCartHydrated, useCartStore } from "@/lib/cart/store";
import { excludeCancelledOrders, formatOrderTimestamp, orderTypeLabel, statusLabel } from "@/lib/order/status";
import { ErrorState, Skeleton } from "@/components/ui/LayoutPrimitives";

const CURRENT_STATUSES = new Set<CurrentOrder["status"]>([
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
]);
const PAST_STATUSES = new Set<CurrentOrder["status"]>(["COMPLETED"]);

function statusClasses(status: CurrentOrder["status"]): string {
  if (status === "COMPLETED") return "bg-status-successBg text-emerald-700";
  if (status === "CANCELLED") return "bg-status-errorBg text-brand-red";
  return "bg-blushTint text-brand-red";
}

function StatusPill({ status }: { status: CurrentOrder["status"] }) {
  return (
    <span className={`inline-flex max-w-full shrink-0 rounded-full px-2.5 py-1 text-caption font-bold ${statusClasses(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function OrderRows({ orders }: { orders: CurrentOrder[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {orders.map((order) => (
          <article key={order.publicToken} className="rounded-md border border-border-default bg-white p-4 shadow-card">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <Link href={`/order/${order.publicToken}`} className="min-w-0 flex-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-red">
                <span className="block break-words font-heading font-bold text-charcoal">{order.orderNumber}</span>
                <time dateTime={order.createdAt} className="mt-1 block text-caption text-bodySecondary">
                  {formatOrderTimestamp(order.createdAt)}
                </time>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cream-alt px-2.5 py-1 text-caption font-medium text-charcoal">
                    {orderTypeLabel(order.orderType)}
                  </span>
                  <span className="text-caption text-bodySecondary">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </span>
                </span>
              </Link>
              <StatusPill status={order.status} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-default pt-3">
              <p className="font-heading text-h4 font-extrabold text-brand-red">₹{order.total}</p>
              <Link href={`/order/${order.publicToken}/invoice`} className="shrink-0 rounded-sm text-sm font-semibold text-brand-red underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-red">
                Invoice
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-md border border-border-default bg-white shadow-card md:block">
        <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(90px,1.15fr)_minmax(84px,1fr)_minmax(48px,.6fr)_minmax(72px,.8fr)_minmax(88px,1fr)_minmax(52px,.6fr)] items-center gap-2 border-b border-border-default bg-cream-bg px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-bodySecondary lg:gap-3 lg:px-4">
          <span>Order</span><span>Placed</span><span>Type</span><span>Items</span><span>Total</span><span>Status</span><span className="text-right">Invoice</span>
        </div>
        <div className="divide-y divide-border-default">
          {orders.map((order) => (
            <div key={order.publicToken} className="grid grid-cols-[minmax(0,1.35fr)_minmax(90px,1.15fr)_minmax(84px,1fr)_minmax(48px,.6fr)_minmax(72px,.8fr)_minmax(88px,1fr)_minmax(52px,.6fr)] items-center gap-2 px-3 py-3 text-sm lg:gap-3 lg:px-4">
              <Link href={`/order/${order.publicToken}`} className="min-w-0 break-words font-semibold text-charcoal hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red">
                {order.orderNumber}
              </Link>
              <time dateTime={order.createdAt} className="min-w-0 text-xs leading-snug text-bodySecondary">
                {formatOrderTimestamp(order.createdAt)}
              </time>
              <span className="min-w-0 break-words text-xs text-charcoal">{orderTypeLabel(order.orderType)}</span>
              <span className="text-xs text-bodySecondary">{order.itemCount}</span>
              <span className="break-words font-heading font-bold text-brand-red">₹{order.total}</span>
              <span className="min-w-0"><StatusPill status={order.status} /></span>
              <Link href={`/order/${order.publicToken}/invoice`} className="text-right text-xs font-semibold text-brand-red underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-brand-red">
                Invoice
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading current orders" aria-busy="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="rounded-md border border-border-default bg-white p-4 shadow-card">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-48 max-w-full" />
          <Skeleton className="mt-4 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function CurrentOrdersSection() {
  const hasHydrated = useCartHydrated();
  const customerPhone = useCartStore((state) => state.customerPhone);
  const ordersQuery = useCurrentOrders(customerPhone);

  let content;
  if (!hasHydrated || (customerPhone && ordersQuery.isLoading)) {
    content = <OrdersSkeleton />;
  } else if (customerPhone && ordersQuery.isError) {
    const rateLimited = ordersQuery.error instanceof ApiError && ordersQuery.error.status === 429;
    content = (
      <ErrorState
        message={rateLimited ? "Too many requests, try again shortly." : "We could not load your orders. Please try again."}
        onRetry={() => { void ordersQuery.refetch(); }}
      />
    );
  } else {
    const orders = excludeCancelledOrders(ordersQuery.data ?? []);
    const currentOrders = orders.filter((order) => CURRENT_STATUSES.has(order.status));
    const pastOrders = orders.filter((order) => PAST_STATUSES.has(order.status));
    content = orders.length === 0 ? (
      <div className="rounded-md border border-dashed border-border-default bg-cream-bg px-5 py-8 text-center">
        <p className="font-heading font-bold text-charcoal">No orders yet</p>
        <p className="mt-1 text-body text-bodySecondary">Orders you place will show up here.</p>
      </div>
    ) : (
      <div className="space-y-5">
        {currentOrders.length > 0 && <OrderRows orders={currentOrders} />}
        {pastOrders.length > 0 && (
          <details className="group rounded-md border border-border-default bg-white shadow-card">
            <summary className="cursor-pointer list-none rounded-md px-4 py-3 font-heading font-bold text-charcoal marker:hidden focus:outline-none focus:ring-2 focus:ring-brand-red">
              <span className="inline-flex items-center gap-2">
                <svg aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-90" viewBox="0 0 16 16" fill="currentColor"><path d="m5 2 6 6-6 6V2Z" /></svg>
                Past orders <span className="rounded-full bg-neutralTint px-2 py-0.5 text-caption font-semibold text-bodySecondary">{pastOrders.length}</span>
              </span>
            </summary>
            <div className="border-t border-border-default p-3 sm:p-4">
              <OrderRows orders={pastOrders} />
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="current-orders-title" className="space-y-4">
      <div>
        <h2 id="current-orders-title" className="font-heading text-h3 font-bold text-charcoal">Your current orders</h2>
        <p className="mt-1 text-body text-bodySecondary">Follow the latest status of your orders.</p>
      </div>
      {content}
    </section>
  );
}
