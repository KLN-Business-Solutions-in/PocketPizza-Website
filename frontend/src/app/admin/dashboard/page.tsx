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
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
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
          <p className="mt-1 text-body">
            Orders: {report.data.orderCount.total} (completed {report.data.orderCount.completed},
            cancelled {report.data.orderCount.cancelled}) · Sales{" "}
            {formatINR(report.data.salesTotal)} · AOV {formatINR(report.data.averageOrderValue)}
          </p>
          {report.data.topItems.length > 0 && (
            <p className="mt-1 text-caption text-mutedGray">
              Top: {report.data.topItems.map((t) => `${t.name} ×${t.quantity}`).join(", ")}
            </p>
          )}
        </Card>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Filters:</span>
          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter((e.target.value || undefined) as OrderStatus | undefined)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>{s || "All statuses"}</option>
            ))}
          </select>
          <select
            value={typeFilter ?? ""}
            onChange={(e) => setTypeFilter((e.target.value || undefined) as OrderType | undefined)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="DELIVERY">DELIVERY</option>
            <option value="PICKUP">PICKUP</option>
            <option value="DINE_IN">DINE_IN</option>
          </select>
        </div>
        <div className="text-xs text-gray-500 font-medium">
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
        <Card className="border-l-4 border-l-brand-red">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="font-heading font-bold text-lg">KOT Detail</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </div>
          {detail.isLoading && <p className="text-body py-4">Loading order details…</p>}
          {detail.isError && <ErrorState message="Failed to load order detail." onRetry={() => detail.refetch()} />}
          {detail.data && (
            <div className="mt-4 space-y-3 text-body">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 text-lg">{detail.data.orderNumber}</span>
                  <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {detail.data.orderType}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-red/10 text-brand-red">
                  {detail.data.status}
                </span>
              </div>
              <p className="text-bodySecondary text-sm">
                Customer: <strong className="text-gray-800">{detail.data.customer.name}</strong> ({detail.data.customer.phone})
              </p>
              {detail.data.notes && (
                <p className="text-xs bg-amber-50 text-amber-900 p-2 rounded border border-amber-200">
                  Notes: {detail.data.notes}
                </p>
              )}
              <div className="border-t border-b py-2 space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase">Items</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {detail.data.items.map((it, i) => (
                    <li key={i}>
                      <span className="font-semibold">{it.quantity}×</span> {it.nameSnapshot}
                      {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                      {it.addOnSnapshot && it.addOnSnapshot.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {" "}+ {it.addOnSnapshot.map((a) => a.label).join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between font-bold text-base">
                <span>Total Amount:</span>
                <span>{formatINR(detail.data.total)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {ALLOWED_TRANSITIONS[detail.data.status].map((next) => (
                  <Button key={next} size="sm" onClick={() => doTransition(next)} isLoading={updateStatus.isPending}>
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

