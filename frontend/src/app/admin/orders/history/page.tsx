"use client";

import Link from "next/link";
import React from "react";
import { useAdminOrders } from "@/lib/api/admin";
import type { AdminOrderSummary, OrderStatus } from "@shared/contract/contract";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";
import { Button } from "@/components/ui/Button";

type HistoryStatus = Extract<OrderStatus, "COMPLETED" | "CANCELLED">;
const PAGE_SIZE = 100;

export default function AdminOrderHistoryPage() {
  const [status, setStatus] = React.useState<HistoryStatus>("COMPLETED");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const orders = useAdminOrders({
    status,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    page,
    pageSize: PAGE_SIZE + 1,
  });

  const list: AdminOrderSummary[] = Array.isArray(orders.data)
    ? orders.data
    : orders.data?.items ?? [];
  const hasNextPage = list.length > PAGE_SIZE;
  const visibleList = list.slice(0, PAGE_SIZE);

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="font-heading text-h2 font-bold">Order History</h1>
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
      ) : visibleList.length === 0 ? (
        <Card className="p-4 sm:p-6">
          <p className="py-4 text-center text-body text-bodySecondary">
            No orders match these filters.
          </p>
        </Card>
      ) : (
        <Card className="min-w-0 overscroll-x-contain overflow-x-auto p-0">
          <table className="w-full min-w-[720px] border-collapse text-left text-body">
            <thead className="bg-neutralTint text-caption uppercase text-bodySecondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Date / time</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleList.map((order) => (
                <tr key={order.id} className="border-t border-border-default">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(order.id)}`}
                      className="text-brand-red underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="max-w-56 break-words px-4 py-3">{order.customer.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">{order.orderType.replaceAll("_", " ")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{order.total}</td>
                  <td className="whitespace-nowrap px-4 py-3">{order.status.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
