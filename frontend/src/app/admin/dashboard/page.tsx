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
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import type { OrderStatus, OrderType } from "@shared/contract/contract";

/**
 * Admin dashboard — Backend Master Reference §11.7–11.9, §14, §17.
 * - List: status/dateFrom/dateTo/type filters, page/pageSize (max 100)
 * - Detail: KOT view + status history
 * - Status PATCH: hardcoded allow-list; READY→OUT_FOR_DELIVERY only for
 *   DELIVERY, READY→COMPLETED only when not DELIVERY.
 * Cross-restaurant IDs surface as 404 (never trust client restaurantId, §20.10).
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

  const [status, setStatus] = React.useState<OrderStatus | undefined>(undefined);
  const [type, setType] = React.useState<OrderType | undefined>(undefined);
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reportFrom] = React.useState(() => today());
  const [reportTo] = React.useState(() => today());

  const orders = useAdminOrders({ status, type, page, pageSize: 20 });
  const detail = useAdminOrderDetail(selectedId ?? undefined);
  const updateStatus = useUpdateOrderStatus(selectedId ?? "");
  const report = useReportSummary(reportFrom, reportTo, session.data?.ok === true);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session.data?.ok === false) router.replace("/admin/login");
  }, [session.data, router]);

  if (session.isLoading) return <p className="py-12 text-body">Checking session…</p>;
  if (session.data?.ok === false) return null;

  const list: { id: string; orderNumber: string; status: OrderStatus; orderType: OrderType; total: string; customer: { name: string; phone: string }; createdAt: string }[] =
    Array.isArray(orders.data) ? orders.data : (orders.data as { items?: typeof list })?.items ?? [];

  const doTransition = async (next: OrderStatus) => {
    setStatusError(null);
    if (!selectedId || !detail.data) return;
    // Client-side guard mirrors §17 (server still enforces).
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
    } catch (err) {
      const api = err as ApiError;
      setStatusError(api?.message || "Status update failed.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-heading font-bold">Admin Dashboard</h1>
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

      <Card>
        <div className="flex flex-wrap gap-2">
          <select
            value={status ?? ""}
            onChange={(e) => { setStatus((e.target.value || undefined) as OrderStatus | undefined); setPage(1); }}
            className="rounded-md border px-3 py-2 text-body"
            aria-label="Filter by status"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>{s || "All statuses"}</option>
            ))}
          </select>
          <select
            value={type ?? ""}
            onChange={(e) => { setType((e.target.value || undefined) as OrderType | undefined); setPage(1); }}
            className="rounded-md border px-3 py-2 text-body"
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="DELIVERY">DELIVERY</option>
            <option value="PICKUP">PICKUP</option>
            <option value="DINE_IN">DINE_IN</option>
          </select>
        </div>

        {orders.isError && (
          <div className="mt-3">
            <ErrorState message="Failed to load orders." onRetry={() => orders.refetch()} />
          </div>
        )}
        <ul className="mt-3 divide-y">
          {list.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => setSelectedId(o.id)}
                className={`flex w-full items-center justify-between py-2 text-left text-body hover:text-brand-red ${selectedId === o.id ? "font-bold text-brand-red" : ""}`}
              >
                <span>{o.orderNumber} · {o.customer.name} · {o.status}</span>
                <span className="font-semibold">{formatINR(o.total)}</span>
              </button>
            </li>
          ))}
        </ul>
        {list.length === 0 && !orders.isLoading && (
          <p className="mt-2 text-body text-bodySecondary">No orders for these filters.</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <span className="px-2 py-1 text-body">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </Card>

      {selectedId && (
        <Card>
          <h2 className="font-heading font-bold">KOT detail</h2>
          {detail.isLoading && <p className="text-body">Loading…</p>}
          {detail.isError && <ErrorState message="Failed to load order detail." onRetry={() => detail.refetch()} />}
          {detail.data && (
            <div className="mt-2 space-y-2 text-body">
              <p>
                {detail.data.orderNumber} · {detail.data.orderType} · {detail.data.status}
              </p>
              <p className="text-bodySecondary">
                {detail.data.customer.name} · {detail.data.customer.phone}
              </p>
              <ul className="list-disc pl-5">
                {detail.data.items.map((it, i) => (
                  <li key={i}>
                    {it.quantity}× {it.nameSnapshot}
                    {it.variantSnapshot ? ` (${it.variantSnapshot})` : ""}
                  </li>
                ))}
              </ul>
              <p className="font-bold">Total {formatINR(detail.data.total)}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {ALLOWED_TRANSITIONS[detail.data.status].map((next) => (
                  <Button key={next} size="sm" onClick={() => doTransition(next)} isLoading={updateStatus.isPending}>
                    → {next.replaceAll("_", " ")}
                  </Button>
                ))}
              </div>
              {statusError && <ErrorState message={statusError} />}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
