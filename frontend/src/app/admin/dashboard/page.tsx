"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ALLOWED_TRANSITIONS,
  useAdminOrderDetail,
  useAdminOrders,
  useReportSummary,
  useUpdateOrderStatus,
} from "@/lib/api/admin";
import { useAdminLogout, useAdminSession } from "@/lib/api/auth";
import { formatINR } from "@/lib/money";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { KanbanBoard, KanbanOrder } from "@/components/admin/KanbanBoard";
import type { OrderStatus, OrderType } from "@shared/contract/contract";

/**
 * Admin dashboard — Backend Master Reference §11.7–11.9, §14, §17.
 * Kanban Board across 7 statuses: NEW, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, COMPLETED, CANCELLED.
 */

const STATUSES: (OrderStatus | "")[] = [
  "",
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const session = useAdminSession();
  const logout = useAdminLogout();

  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = React.useState<OrderType | undefined>(undefined);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reportFrom] = React.useState(() => today());
  const [reportTo] = React.useState(() => today());

  const orders = useAdminOrders({ status: statusFilter, type: typeFilter, page: 1, pageSize: 100 });
  const detail = useAdminOrderDetail(selectedId ?? undefined);
  const updateStatus = useUpdateOrderStatus(selectedId ?? "");
  const report = useReportSummary(reportFrom, reportTo, session.data?.ok === true);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (session.data?.ok === false) router.replace("/admin/login");
  }, [session.data, router]);

  if (session.isLoading) return <p className="py-12 text-body">Checking session…</p>;
  if (session.data?.ok === false) return null;

  const list: KanbanOrder[] = Array.isArray(orders.data)
    ? (orders.data as KanbanOrder[])
    : ((orders.data as { items?: KanbanOrder[] })?.items ?? []);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-h2 font-heading font-bold">Admin Dashboard</h1>
          <p className="text-caption text-gray-500">Live order queue and status workflow</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await logout.mutateAsync();
            router.replace("/admin/login");
          }}
        >
          Logout
        </Button>
      </div>

      {report.data && (
        <Card>
          <h2 className="font-heading font-bold">Today&apos;s summary</h2>
          <p className="mt-1 break-words text-body">
            Orders: {report.data.orderCount.total} (completed {report.data.orderCount.completed},
            cancelled {report.data.orderCount.cancelled}) · Sales{" "}
            {formatINR(report.data.salesTotal)} · AOV {formatINR(report.data.averageOrderValue)}
          </p>
          {report.data.topItems.length > 0 && (
            <p className="mt-1 break-words text-caption text-mutedGray">
              Top: {report.data.topItems.map((t) => `${t.name} ×${t.quantity}`).join(", ")}
            </p>
          )}
        </Card>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border-default bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <span className="col-span-full text-xs font-semibold uppercase tracking-wider text-gray-600 sm:col-span-1">Filters:</span>
          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter((e.target.value || undefined) as OrderStatus | undefined)}
            className="w-full min-w-0 rounded-lg border border-border-default bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 sm:w-auto"
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>{s || "All statuses"}</option>
            ))}
          </select>
          <select
            value={typeFilter ?? ""}
            onChange={(e) => setTypeFilter((e.target.value || undefined) as OrderType | undefined)}
            className="w-full min-w-0 rounded-lg border border-border-default bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 sm:w-auto"
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="DELIVERY">DELIVERY</option>
            <option value="PICKUP">PICKUP</option>
            <option value="DINE_IN">DINE_IN</option>
          </select>
        </div>
        <div className="text-xs font-medium text-gray-500 sm:shrink-0">
          Total orders: <strong className="text-gray-900">{list.length}</strong>
        </div>
      </div>

      {statusError && <ErrorState message={statusError} />}

      {orders.isError && (
        <ErrorState message="Failed to load orders." onRetry={() => orders.refetch()} />
      )}

      {/* 7-Column Kanban Board */}
      <KanbanBoard
        orders={list}
        selectedId={selectedId}
        onSelectOrder={setSelectedId}
        onUpdateStatus={handleUpdateStatus}
        isUpdating={isUpdating}
      />

      {/* KOT Detail Drawer/Card */}
      {selectedId && (
        <Card className="min-w-0 border-l-4 border-l-brand-red p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-border-default pb-2">
            <h2 className="font-heading font-bold text-lg">KOT Detail</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </div>
          {detail.isLoading && <p className="text-body py-4">Loading order details…</p>}
          {detail.isError && <ErrorState message="Failed to load order detail." onRetry={() => detail.refetch()} />}
          {detail.data && (
            <div className="mt-4 min-w-0 space-y-3 text-body">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-y-1">
                  <span className="break-all text-lg font-bold text-gray-900">{detail.data.orderNumber}</span>
                  <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {detail.data.orderType}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-brand-red/10 px-2.5 py-1 text-xs font-bold text-brand-red">
                  {detail.data.status}
                </span>
              </div>
              <p className="break-words text-sm text-bodySecondary">
                Customer: <strong className="text-gray-800">{detail.data.customer.name}</strong> ({detail.data.customer.phone})
              </p>
              {detail.data.orderType === "DELIVERY" && detail.data.address && (
                <address className="break-words text-sm text-bodySecondary not-italic">
                  {detail.data.address.line1}
                  {detail.data.address.line2 ? `, ${detail.data.address.line2}` : ""}
                  {detail.data.address.landmark ? ` (${detail.data.address.landmark})` : ""}
                  <br />
                  {detail.data.address.city}, {detail.data.address.pincode}
                </address>
              )}
              {detail.data.notes && (
                <p className="break-words rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Notes: {detail.data.notes}
                </p>
              )}
              <div className="min-w-0 space-y-2 border-y border-border-default py-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Items</p>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {detail.data.items.map((it, i) => (
                    <li key={i} className="break-words">
                      <span className="font-semibold">{it.quantity}×</span> {it.nameSnapshot}
                      {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                      {it.addOnSnapshot && it.addOnSnapshot.length > 0 && (
                        <span className="break-words text-xs text-gray-500">
                          {" "}+ {it.addOnSnapshot.map((a) => a.label).join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-base font-bold">
                <span>Total Amount:</span>
                <span>{formatINR(detail.data.total)}</span>
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                {ALLOWED_TRANSITIONS[detail.data.status].map((next) => (
                  <Button key={next} size="sm" className="w-full whitespace-normal px-3 text-center sm:w-auto" onClick={() => doTransition(next)} isLoading={updateStatus.isPending}>
                    → {next.replaceAll("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

