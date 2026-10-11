"use client";

import Link from "next/link";
import React from "react";
import { useAdminOrderDetail, useAdminOrders } from "@/lib/api/admin";
import type { AdminOrderDetail, AdminOrderSummary, OrderStatus } from "@shared/contract/contract";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { Button } from "@/components/ui/Button";

type HistoryStatus = Extract<OrderStatus, "COMPLETED" | "CANCELLED">;
const PAGE_SIZE = 100;

function HistoryOrderDetail({ order }: { order: AdminOrderDetail }) {
  const completedAt = order.statusHistory.find((entry) => entry.newStatus === order.status)?.changedAt;
  const elapsedMinutes = completedAt
    ? Math.max(0, Math.round((new Date(completedAt).getTime() - new Date(order.createdAt).getTime()) / 60000))
    : null;

  return (
    <div className="min-w-0 space-y-5">
      <header className="border-b border-border-default pb-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="break-all font-heading text-h3 font-bold text-charcoal">Order {order.orderNumber}</h2>
          <span className={`shrink-0 rounded-full px-3 py-1 text-caption font-bold ${order.status === "COMPLETED" ? "bg-status-successBg text-emerald-600" : "bg-status-errorBg text-brand-red"}`}>
            {order.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-2 text-caption text-bodySecondary">
          Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {elapsedMinutes !== null && <span className="ml-2 font-semibold text-emerald-600">· {order.status === "CANCELLED" ? "Cancelled" : "Completed"} in {elapsedMinutes} minutes</span>}
        </p>
      </header>

      <section>
        <h3 className="text-tag font-bold uppercase tracking-wide text-mutedGray">Customer &amp; Delivery</h3>
        <div className="mt-2 rounded-xl border border-border-default bg-cream-bg p-4">
          <p className="font-heading font-bold text-charcoal">{order.customer.name}</p>
          <p className="mt-1 break-words text-body text-bodySecondary">{order.customer.phone}</p>
          {order.orderType === "DELIVERY" && order.address && (
            <address className="mt-2 break-words text-body text-charcoal not-italic">
              {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}
              {order.address.landmark ? ` (${order.address.landmark})` : ""}, {order.address.city}, {order.address.pincode}
            </address>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-tag font-bold uppercase tracking-wide text-mutedGray">Items ordered</h3>
        <ul className="mt-3 space-y-3">
          {order.items.map((item, index) => (
            <li key={`${item.menuItemId}-${index}`} className="flex min-w-0 justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-heading font-bold text-charcoal">{item.quantity}× {item.nameSnapshot}</p>
                {item.variantSnapshot && <p className="mt-1 break-words text-caption text-bodySecondary">· {item.variantSnapshot}</p>}
                {item.addOnSnapshot.length > 0 && <p className="mt-1 break-words text-caption text-brand-red">+ {item.addOnSnapshot.map((addOn) => addOn.label).join(", ")}</p>}
              </div>
              <span className="shrink-0 font-semibold text-charcoal">{item.lineTotal}</span>
            </li>
          ))}
        </ul>
      </section>

      <dl className="space-y-2 rounded-xl bg-cream-bg p-4 text-body">
        <div className="flex justify-between gap-3"><dt className="text-bodySecondary">Subtotal</dt><dd>{order.subtotal}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-bodySecondary">Delivery</dt><dd className={order.deliveryFee === "0.00" ? "font-semibold text-emerald-600" : ""}>{order.deliveryFee === "0.00" ? "FREE" : order.deliveryFee}</dd></div>
        <div className="flex justify-between gap-3 border-t border-border-default pt-2 font-heading text-lg font-bold"><dt>Total Balance</dt><dd className="text-brand-red">{order.total}</dd></div>
      </dl>
    </div>
  );
}

export default function AdminOrderHistoryPage() {
  const [status, setStatus] = React.useState<HistoryStatus>("COMPLETED");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const orders = useAdminOrders({
    status,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    page,
    pageSize: PAGE_SIZE,
  });
  const selectedOrder = useAdminOrderDetail(selectedId ?? undefined);

  const list: AdminOrderSummary[] = Array.isArray(orders.data)
    ? orders.data
    : orders.data?.items ?? [];
  const hasNextPage = list.length === PAGE_SIZE;

  React.useEffect(() => {
    if (list.length > 0 && !list.some((order) => order.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="font-heading text-h2 font-bold">{status === "COMPLETED" ? "Completed Records" : "Cancelled Records"}</h1>
        <p className="mt-1 text-body text-bodySecondary">
          Browse completed and cancelled orders.
        </p>
      </div>

      <Card className="min-w-0 p-4 sm:p-6">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <label className="flex flex-col gap-1 text-caption font-semibold text-bodySecondary">
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as HistoryStatus);
                setPage(1);
              }}
              className="w-full min-w-0 rounded-md border border-border-default bg-white px-3 py-2 text-body text-charcoal"
            >
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-caption font-semibold text-bodySecondary">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              className="w-full min-w-0 rounded-md border border-border-default bg-white px-3 py-2 text-body text-charcoal"
            />
          </label>
          <label className="flex flex-col gap-1 text-caption font-semibold text-bodySecondary">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              className="w-full min-w-0 rounded-md border border-border-default bg-white px-3 py-2 text-body text-charcoal"
            />
          </label>
        </div>
      </Card>

      {orders.isLoading ? (
        <p className="py-8 text-body text-bodySecondary">Loading order history…</p>
      ) : orders.isError ? (
        <ErrorState
          message="Could not load order history."
          onRetry={() => orders.refetch()}
        />
      ) : list.length === 0 ? (
        <Card className="p-4 sm:p-6">
          <p className="py-4 text-center text-body text-bodySecondary">
            No orders match these filters.
          </p>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.9fr)]">
          <div className="min-w-0">
            <Card className="hidden min-w-0 overflow-hidden p-0 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-body">
                  <thead className="bg-cream-bg text-caption uppercase text-bodySecondary">
                    <tr className="border-b border-border-default">
                      <th className="px-4 py-3 font-semibold">Order</th>
                      <th className="px-4 py-3 font-semibold">Date/Time</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((order) => {
                      const isSelected = selectedId === order.id;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedId(order.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedId(order.id);
                            }
                          }}
                          tabIndex={0}
                          aria-selected={isSelected}
                          className={`cursor-pointer border-t border-border-default transition-colors hover:bg-cream-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red ${isSelected ? "bg-blushTint" : "bg-white"}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-charcoal">
                            <Link href={`/admin/orders/${encodeURIComponent(order.id)}?from=history`} className="hover:text-brand-red">
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-bodySecondary">{new Date(order.createdAt).toLocaleString()}</td>
                          <td className="max-w-56 break-words px-4 py-3 font-semibold">{order.customer.name}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`rounded-md px-2 py-1 text-caption font-semibold ${order.orderType === "DELIVERY" ? "bg-status-errorBg text-brand-red" : "bg-amber-50 text-amber-700"}`}>
                              {order.orderType === "PICKUP" ? "Collection" : order.orderType === "DINE_IN" ? "Dine-in" : "Delivery"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-caption font-bold ${order.status === "COMPLETED" ? "bg-status-successBg text-emerald-600" : "bg-status-errorBg text-brand-red"}`}>
                              {order.status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-bold">{order.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-3 md:hidden">
              {list.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${encodeURIComponent(order.id)}?from=history`}
                  className="block rounded-xl border border-border-default bg-white p-4 shadow-card transition-colors hover:border-brand-red"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-charcoal">{order.orderNumber}</p>
                      <p className="mt-1 break-words text-body font-semibold">{order.customer.name}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-bold ${order.status === "COMPLETED" ? "bg-status-successBg text-emerald-600" : "bg-status-errorBg text-brand-red"}`}>
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-3 text-caption text-bodySecondary">
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                    <span>{order.orderType === "PICKUP" ? "Collection" : order.orderType === "DINE_IN" ? "Dine-in" : "Delivery"}</span>
                    <span className="font-bold text-charcoal">{order.total}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="hidden min-w-0 self-start rounded-xl border border-border-default bg-white p-5 shadow-card xl:block">
            {selectedOrder.isLoading ? (
              <p className="py-8 text-body text-bodySecondary">Loading order details…</p>
            ) : selectedOrder.isError || !selectedOrder.data ? (
              <div className="py-8 text-center">
                <p className="font-heading font-bold text-charcoal">Select a completed record</p>
                <p className="mt-2 text-caption text-bodySecondary">Choose a row to view its order details here.</p>
              </div>
            ) : (
              <HistoryOrderDetail order={selectedOrder.data} />
            )}
          </aside>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1 || orders.isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <span className="text-caption text-bodySecondary">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage || orders.isLoading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
