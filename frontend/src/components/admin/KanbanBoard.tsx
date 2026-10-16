"use client";

import React from "react";
import type { OrderStatus, OrderType } from "@shared/contract/contract";
import { formatINR } from "@/lib/money";
import { getOrderTransitions, OrderActionButton } from "@/components/admin/OrderActionButton";
import { Button } from "@/components/ui/Button";

export type KanbanOrder = {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  orderType: OrderType;
  status: OrderStatus;
  total: string;
  createdAt: string;
  items?: Array<{
    quantity: number;
    nameSnapshot?: string;
    variantSnapshot?: string | null;
  }>;
};

interface KanbanBoardProps {
  orders: KanbanOrder[];
  onSelectOrder?: (id: string) => void;
  selectedId?: string | null;
  onUpdateStatus?: (id: string, status: OrderStatus) => Promise<void> | void;
  isUpdating?: boolean;
  emptyMessage?: string;
}

function formatTimeAgo(isoString: string): string {
  try {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "--:--";
  }
}

export function KanbanBoard({
  orders,
  onSelectOrder,
  selectedId,
  onUpdateStatus,
  isUpdating,
  emptyMessage = "No orders",
}: KanbanBoardProps) {
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleTransition = async (orderId: string, nextStatus: OrderStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateStatus) return;
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const renderOrderRow = (order: KanbanOrder) => {
    const isSelected = selectedId === order.id;
    const transitions = getOrderTransitions(order.status, order.orderType);
    const itemCount = order.items
      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 1;
    const typeLabel =
      order.orderType === "PICKUP" ? "Collection" : order.orderType === "DELIVERY" ? "Delivery" : "Dine-in";
    const statusColor: Record<OrderStatus, string> = {
      NEW: "bg-amber-100 text-amber-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      PREPARING: "bg-indigo-100 text-indigo-800",
      READY: "bg-emerald-100 text-emerald-800",
      OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-rose-100 text-rose-800",
    };

    return (
      <div key={order.id} className="min-w-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectOrder?.(order.id)}
          onKeyDown={(e) => {
            if (e.currentTarget !== e.target || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            onSelectOrder?.(order.id);
          }}
          className={`group relative flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-white p-3 text-body transition-all ${
            isSelected
              ? "border-2 border-brand-red bg-blushTint/50 shadow-sm"
              : "border-border-default hover:border-brand-red/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          }`}
        >
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex items-center gap-2">
              <span className="truncate font-heading text-h4 font-bold text-charcoal">{order.orderNumber}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-tag font-semibold ${statusColor[order.status]}`}
              >
                {order.status}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:justify-end">
              <p className="min-w-0 truncate text-body font-semibold text-charcoal">{order.customer.name}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-tag font-semibold ${order.orderType === "DELIVERY" ? "bg-blushTint text-brand-red" : "bg-neutralTint text-bodySecondary"}`}>
                {typeLabel}
              </span>
              <span className="shrink-0 font-heading text-h4 font-bold text-brand-red">{formatINR(order.total)}</span>
            </div>
          </div>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-3 border-t border-border-default pt-2 sm:hidden lg:hidden">
            <span className="text-caption text-bodySecondary">{formatTimeAgo(order.createdAt)}</span>
            <span className="text-caption text-bodySecondary">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
            <span className="text-caption text-bodySecondary">{order.customer.phone}</span>
          </div>
        </div>

        {isSelected && (
          <div className="mt-2 rounded-xl border border-border-default bg-cream-bg/60 p-3 text-body">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-caption font-bold text-bodySecondary uppercase tracking-wider mb-1">Customer</p>
                <p className="text-body text-charcoal">{order.customer.name}</p>
                <p className="mt-1 text-caption text-bodySecondary">{order.customer.phone}</p>
              </div>
              <div>
                <p className="text-caption font-bold text-bodySecondary uppercase tracking-wider mb-1">Type</p>
                <p className="text-body text-charcoal">{typeLabel}</p>
                <p className="mt-1 text-caption text-bodySecondary">{formatTimeAgo(order.createdAt)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-caption font-bold text-bodySecondary uppercase tracking-wider mb-1">Items</p>
                <ul className="space-y-1">
                  {(order.items ?? []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                      <span className="shrink-0 font-semibold text-brand-red">{item.quantity}×</span>
                      <span className="break-words">{item.nameSnapshot}</span>
                      {item.variantSnapshot && (
                        <span className="ml-1 text-caption text-bodySecondary">({item.variantSnapshot})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              {transitions.includes("CONFIRMED") && (
                <OrderActionButton
                  status="CONFIRMED"
                  label="Accept"
                  tone="success"
                  disabled={isUpdating || updatingId === order.id}
                  isLoading={updatingId === order.id}
                  onClick={(e) => handleTransition(order.id, "CONFIRMED", e)}
                  className="w-auto"
                />
              )}
              {transitions.includes("CANCELLED") && (
                <OrderActionButton
                  status="CANCELLED"
                  label="Reject"
                  disabled={isUpdating || updatingId === order.id}
                  isLoading={updatingId === order.id}
                  onClick={(e) => handleTransition(order.id, "CANCELLED", e)}
                  className="w-auto"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-w-0">
      {orders.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border-default bg-white px-5 text-center text-body text-bodySecondary">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">{sorted.map(renderOrderRow)}</div>
      )}
    </div>
  );
}
