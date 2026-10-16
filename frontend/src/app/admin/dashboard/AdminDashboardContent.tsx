"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ALLOWED_TRANSITIONS,
  useAdminOrderDetail,
  useAdminOrders,
  useUpdateOrderStatus,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/api/auth";
import { formatINR } from "@/lib/money";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/LayoutPrimitives";
import { KanbanBoard, KanbanOrder } from "@/components/admin/KanbanBoard";
import { getOrderTransitions, OrderActionButton } from "@/components/admin/OrderActionButton";
import type { OrderStatus, OrderType } from "@shared/contract/contract";

/**
 * Admin dashboard — Backend Master Reference §11.7–11.9, §14, §17.
 * Kanban Board across 7 statuses: NEW, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, COMPLETED, CANCELLED.
 */

type StatusFilter = "ALL" | OrderStatus;

const FILTER_STATUS_GROUPS: Record<StatusFilter, readonly OrderStatus[]> = {
  ALL: ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  NEW: ["NEW"],
  CONFIRMED: ["CONFIRMED"],
  PREPARING: ["PREPARING"],
  READY: ["READY"],
  OUT_FOR_DELIVERY: ["OUT_FOR_DELIVERY"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

const ORDER_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All Orders" },
  { key: "NEW", label: "New Orders" },
  { key: "CONFIRMED", label: "Confirmed Orders" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready to Handoff" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const EMPTY_MESSAGES: Record<StatusFilter, string> = {
  ALL: "No orders match All Orders",
  NEW: "No new orders",
  CONFIRMED: "No confirmed orders",
  PREPARING: "No preparing orders",
  READY: "No ready-to-handoff orders",
  OUT_FOR_DELIVERY: "No orders out for delivery",
  COMPLETED: "No completed orders",
  CANCELLED: "No cancelled orders",
};

export function AdminDashboardContent() {
  const router = useRouter();
  const session = useAdminSession();

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<OrderType | undefined>(undefined);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const orders = useAdminOrders({ type: typeFilter, page: 1, pageSize: 100 });
  const detail = useAdminOrderDetail(selectedId ?? undefined);
  const updateStatus = useUpdateOrderStatus(selectedId ?? "");
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (session.data?.ok === false) router.replace("/admin/login");
  }, [session.data, router]);

  React.useEffect(() => {
    if (!selectedId) return;
    const mobileViewport = window.matchMedia("(max-width: 1023px)");
    const previousOverflow = document.body.style.overflow;
    const syncScrollLock = () => {
      document.body.style.overflow = mobileViewport.matches ? "hidden" : previousOverflow;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileViewport.matches) setSelectedId(null);
    };
    syncScrollLock();
    mobileViewport.addEventListener("change", syncScrollLock);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      mobileViewport.removeEventListener("change", syncScrollLock);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedId]);

  if (session.isLoading) return <p className="py-12 text-body">Checking session…</p>;
  if (session.data?.ok === false) return null;

  const list: KanbanOrder[] = Array.isArray(orders.data)
    ? (orders.data as KanbanOrder[])
    : ((orders.data as { items?: KanbanOrder[] })?.items ?? []);

  const filteredOrders = list.filter((order) => FILTER_STATUS_GROUPS[statusFilter].includes(order.status));
  const boardOrders = filteredOrders;
  const selectedFilterLabel = ORDER_FILTERS.find((filter) => filter.key === statusFilter)?.label ?? "All Orders";
  const detailTransitions = detail.data
    ? getOrderTransitions(detail.data.status, detail.data.orderType)
    : [];
  const handleUpdateStatus = async (id: string, nextStatus: OrderStatus) => {
    setStatusError(null);
    setIsUpdating(true);
    try {
      await apiFetch(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await orders.refetch();
      if (selectedId === id) {
        await detail.refetch();
      }
    } catch (err) {
      const api = err as ApiError;
      setStatusError(api?.message || "Status update failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const doTransition = async (next: OrderStatus) => {
    setStatusError(null);
    if (!selectedId || !detail.data) return;
    if (!ALLOWED_TRANSITIONS[detail.data.status].includes(next)) {
      setStatusError(`Transition ${detail.data.status} → ${next} is not allowed.`);
      return;
    }
    if (next === "OUT_FOR_DELIVERY" && detail.data.orderType !== "DELIVERY") {
      setStatusError("OUT_FOR_DELIVERY is only valid for DELIVERY orders.");
      return;
    }
    if (next === "COMPLETED" && detail.data.orderType === "DELIVERY" && detail.data.status === "READY") {
      setStatusError("DELIVERY orders go READY → OUT_FOR_DELIVERY, not directly to COMPLETED.");
      return;
    }
    try {
      await updateStatus.mutateAsync({ status: next });
      await orders.refetch();
    } catch (err) {
      const api = err as ApiError;
      setStatusError(api?.message || "Status update failed.");
    }
  };

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-h2 font-heading font-bold">Admin Dashboard</h1>
      </div>

      {statusError && <ErrorState message={statusError} />}

      {orders.isError && (
        <ErrorState message="Failed to load orders." onRetry={() => orders.refetch()} />
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_360px] xl:items-start">
        <aside className="min-w-0 rounded-xl border border-border-default bg-white p-3 shadow-card lg:sticky lg:top-24 lg:p-4">
          <h2 className="hidden px-2 pb-3 font-heading text-h4 font-bold text-charcoal lg:block">Orders</h2>
          <nav aria-label="Order filters" className="hidden space-y-1 lg:block">
            {ORDER_FILTERS.map((filter) => {
              const count = filter.key === "ALL"
                ? list.length
                : list.filter((order) => FILTER_STATUS_GROUPS[filter.key].includes(order.status)).length;
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-body font-medium transition-colors ${active ? "bg-brand-red text-white" : "text-bodySecondary hover:bg-neutralTint hover:text-charcoal"}`}
                >
                  <span className="min-w-0 break-words">{filter.label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-bold ${active ? "bg-white/20 text-white" : "bg-neutralTint text-bodySecondary"}`}>{count}</span>
                </button>
              );
            })}
          </nav>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:hidden">
            {ORDER_FILTERS.map((filter) => {
              const count = filter.key === "ALL"
                ? list.length
                : list.filter((order) => FILTER_STATUS_GROUPS[filter.key].includes(order.status)).length;
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-caption font-semibold transition-colors ${active ? "border-brand-red bg-brand-red text-white" : "border-border-default bg-white text-bodySecondary"}`}
                >
              <span className="whitespace-nowrap">{filter.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-tag ${active ? "bg-white/20" : "bg-neutralTint"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 hidden border-t border-border-default pt-4 lg:block">
            <label className="block text-caption font-semibold text-bodySecondary" htmlFor="order-type-filter">Order type</label>
            <select
              id="order-type-filter"
              value={typeFilter ?? ""}
              onChange={(e) => setTypeFilter((e.target.value || undefined) as OrderType | undefined)}
              className="mt-2 w-full min-w-0 rounded-lg border border-border-default bg-white px-3 py-2 text-body text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            >
              <option value="">All types</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Collection</option>
              <option value="DINE_IN">Dine-in</option>
            </select>
          </div>
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-white p-3 sm:p-4">
            <div>
              <h2 className="font-heading text-h4 font-bold text-charcoal">Live Orders</h2>
              <p className="mt-1 text-caption text-bodySecondary">
                {selectedFilterLabel} · {boardOrders.length} matching orders
              </p>
            </div>
            <select
              value={typeFilter ?? ""}
              onChange={(e) => setTypeFilter((e.target.value || undefined) as OrderType | undefined)}
              className="min-w-0 max-w-full rounded-lg border border-border-default bg-white px-3 py-2 text-caption font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-red/20 lg:hidden"
              aria-label="Filter by order type"
            >
              <option value="">All types</option>
              <option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Collection</option>
              <option value="DINE_IN">Dine-in</option>
            </select>
          </div>
          <KanbanBoard
            orders={boardOrders}
            selectedId={selectedId}
            onSelectOrder={setSelectedId}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={isUpdating}
            emptyMessage={EMPTY_MESSAGES[statusFilter]}
          />
        </section>

        <aside className={`${selectedId ? "fixed inset-0 z-[100] flex min-h-0 flex-col bg-cream-bg p-0 pt-[env(safe-area-inset-top)] lg:static lg:z-auto lg:col-span-2 lg:block lg:rounded-xl lg:border lg:border-border-default lg:bg-white lg:p-6 lg:shadow-card xl:sticky xl:top-24 xl:col-span-1 xl:p-6" : "hidden rounded-xl border border-border-default bg-white p-4 shadow-card lg:col-span-2 lg:block xl:sticky xl:top-24 xl:col-span-1 sm:p-6"}`}>
          {selectedId ? (
          <div className="m-3 flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden rounded-3xl border border-[#eadccc] bg-white shadow-card lg:m-0 lg:overflow-visible lg:rounded-xl lg:border-0 lg:bg-transparent lg:shadow-none lg:block lg:flex-none lg:space-y-4">
          <div className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-[#eadccc] bg-white px-5 py-4 lg:static lg:justify-between lg:px-0 lg:py-0 lg:shadow-none">
            <button type="button" onClick={() => setSelectedId(null)} aria-label="Back to orders" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-charcoal hover:bg-neutralTint focus:outline-none focus:ring-2 focus:ring-brand-red lg:hidden">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6M9 12h12" /></svg>
            </button>
            <h2 className="min-w-0 flex-1 truncate font-heading text-lg font-bold text-charcoal">KOT Detail</h2>
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => setSelectedId(null)}>Close</Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 lg:overflow-visible lg:bg-transparent lg:px-0 lg:py-0">
          {detail.isLoading && <p className="text-body py-4">Loading order details…</p>}
          {detail.isError && <ErrorState message="Failed to load order detail." onRetry={() => detail.refetch()} />}
          {detail.data && (
            <div className="mt-4 min-w-0 space-y-3 text-body">
              <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-y-1">
                  <span className="break-all text-xl font-bold text-slate-900">{detail.data.orderNumber}</span>
                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                    {detail.data.orderType}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-brand-red/10 px-3 py-1.5 text-sm font-bold text-brand-red">
                  {detail.data.status}
                </span>
              </div>
              <p className="break-words text-base text-bodySecondary lg:text-sm">
                Customer: <strong className="text-gray-800">{detail.data.customer.name}</strong> ({detail.data.customer.phone})
              </p>
              {detail.data.orderType === "DELIVERY" && detail.data.address && (
                <address className="break-words text-base leading-relaxed text-bodySecondary not-italic lg:text-sm">
                  {detail.data.address.line1}
                  {detail.data.address.line2 ? `, ${detail.data.address.line2}` : ""}
                  {detail.data.address.landmark ? ` (${detail.data.address.landmark})` : ""}
                  <br />
                  {detail.data.address.city}, {detail.data.address.pincode}
                </address>
              )}
              {detail.data.notes && (
                <p className="break-words rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Notes: {detail.data.notes}
                </p>
              )}
              <div className="min-w-0 space-y-3 border-y border-[#eadccc] py-4">
                <p className="text-sm font-bold uppercase text-gray-500">Items</p>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {detail.data.items.map((it, i) => (
                    <li key={i} className="break-words text-base text-charcoal">
                      <span className="font-semibold">{it.quantity}×</span> {it.nameSnapshot}
                      {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                      {it.addOnSnapshot && it.addOnSnapshot.length > 0 && (
                        <span className="break-words text-sm text-gray-500">
                          {" "}+ {it.addOnSnapshot.map((a) => a.label).join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eadccc] pt-4 text-lg font-bold text-charcoal">
                <span>Total Amount:</span>
                <span>{formatINR(detail.data.total)}</span>
              </div>
              {detailTransitions.length > 0 && (
                <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border-default bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur sm:flex-row sm:flex-wrap lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
                  {detailTransitions.map((next) => (
                    <OrderActionButton
                      key={next}
                      status={next}
                      className="sm:w-auto"
                      onClick={() => doTransition(next)}
                      isLoading={updateStatus.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
          </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-cream-bg px-4 text-center">
              <h2 className="font-heading text-h4 font-bold text-charcoal">Order details</h2>
              <p className="mt-2 text-body text-bodySecondary">Select an order to view its details.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

