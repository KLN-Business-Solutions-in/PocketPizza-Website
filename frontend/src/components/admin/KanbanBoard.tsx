"use client";

import React from "react";
import type { OrderStatus, OrderType } from "@shared/contract/contract";
import { formatINR } from "@/lib/money";
import { useUpdateOrderStatus } from "@/lib/api/admin";
import { useToast } from "@/components/ui/ToastProvider";
import { getOrderTransitions, OrderActionButton } from "@/components/admin/OrderActionButton";

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
  emptyMessage?: string;
  isLoading?: boolean;
}

function CardActionRow({ order }: { order: KanbanOrder }) {
  const updateStatus = useUpdateOrderStatus(order.id);
  const toast = useToast();
  const transitions = getOrderTransitions(order.status, order.orderType);

  if (transitions.length === 0) return null;

  const update = async (status: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ status });
      const destination = status
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
      toast.push(`${order.orderNumber} moved to ${destination}`, "success");
    } catch {
      // useUpdateOrderStatus displays its rollback error toast.
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border-default/70 p-3 sm:flex-row sm:flex-wrap">
      {transitions.map((status) => (
        <OrderActionButton
          key={status}
          status={status}
          className="min-w-0 flex-1"
          disabled={updateStatus.isPending}
          isLoading={updateStatus.isPending}
          onClick={() => void update(status)}
        />
      ))}
    </div>
  );
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
  emptyMessage = "No orders",
  isLoading = false,
}: KanbanBoardProps) {
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const renderOrderRow = (order: KanbanOrder) => {
    const isSelected = selectedId === order.id;
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
      <div key={order.id} className={`min-w-0 overflow-hidden rounded-xl border bg-white transition-all ${
        isSelected
          ? "border-2 border-brand-red bg-blushTint/30 shadow-md ring-2 ring-brand-red/10"
          : "border-border-default hover:border-brand-red/40 hover:shadow-sm"
      }`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectOrder?.(order.id)}
          onKeyDown={(e) => {
            if (e.currentTarget !== e.target || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            onSelectOrder?.(order.id);
          }}
          className="group relative flex min-w-0 cursor-pointer flex-col gap-2 p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red"
        >
          {/* Header row: Order ID, status, and Price */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-heading text-sm font-bold text-charcoal">
                {order.orderNumber}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${statusColor[order.status]}`}
              >
                {order.status.replaceAll("_", " ")}
              </span>
            </div>
            <span className="shrink-0 font-heading text-sm font-extrabold text-brand-red">
              {formatINR(order.total)}
            </span>
          </div>

          {/* Customer & Type row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-medium text-charcoal text-xs">
                {order.customer.name}
              </span>
              <span className="text-bodySecondary text-[11px]">
                • {order.customer.phone}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                order.orderType === "DELIVERY"
                  ? "bg-blushTint text-brand-red border border-brand-red/20"
                  : "bg-neutralTint text-bodySecondary"
              }`}
            >
              {typeLabel}
            </span>
          </div>

          {/* Bottom row: Time, items summary count */}
          <div className="flex items-center justify-between gap-2 border-t border-border-default/60 pt-2 text-[11px] text-bodySecondary">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-mutedGray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTimeAgo(order.createdAt)}
            </span>
            <span className="truncate font-medium text-charcoal/80">
              {itemCount} {itemCount === 1 ? "item" : "items"}
              {order.items && order.items.length > 0 && (
                <span className="text-mutedGray font-normal ml-1">
                  ({order.items.slice(0, 2).map((it) => it.nameSnapshot).filter(Boolean).join(", ")}
                  {order.items.length > 2 ? "…" : ""})
                </span>
              )}
            </span>
          </div>
        </div>
        <CardActionRow order={order} />
      </div>
    );
  };

  return (
    <div className="min-w-0">
      {isLoading ? (
        <div className="space-y-2" aria-label="Loading orders" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="animate-pulse rounded-xl border border-border-default bg-white p-4">
              <div className="h-4 w-2/5 rounded bg-neutralTint" />
              <div className="mt-3 h-3 w-3/4 rounded bg-neutralTint" />
              <div className="mt-3 h-3 w-1/2 rounded bg-neutralTint" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border-default bg-white px-5 text-center text-body text-bodySecondary">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">{sorted.map(renderOrderRow)}</div>
      )}
    </div>
  );
}
