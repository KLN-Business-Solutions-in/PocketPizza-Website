"use client";

import React from "react";
import type { OrderStatus, OrderType } from "@shared/contract/contract";
import { formatINR } from "@/lib/money";
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

  const renderOrderCard = (order: KanbanOrder) => {
    const isSelected = selectedId === order.id;
    const transitions = getOrderTransitions(order.status, order.orderType);
    const itemCount = order.items
      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 1;
    const itemSummary = order.items?.slice(0, 2).map((item) => item.nameSnapshot).filter(Boolean);
    const typeLabel = order.orderType === "PICKUP" ? "Collection" : order.orderType === "DELIVERY" ? "Delivery" : "Dine-in";

    return (
      <div
        key={order.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectOrder?.(order.id)}
        onKeyDown={(e) => {
          if (e.currentTarget !== e.target || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          onSelectOrder?.(order.id);
        }}
        className={`group relative flex w-full min-w-0 cursor-pointer flex-col gap-3 rounded-xl border bg-white p-4 shadow-card transition-shadow hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red ${
          isSelected ? "border-2 border-brand-red" : "border-border-default"
        }`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border-default pb-3">
          <span className="truncate font-heading text-h4 font-bold text-charcoal">{order.orderNumber}</span>
          <span className="shrink-0 text-caption font-medium text-bodySecondary">{formatTimeAgo(order.createdAt)}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 truncate text-body font-semibold text-charcoal">{order.customer.name}</p>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-tag font-semibold ${order.orderType === "DELIVERY" ? "bg-blushTint text-brand-red" : "bg-neutralTint text-bodySecondary"}`}>
            {typeLabel}
          </span>
        </div>
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            {itemSummary && itemSummary.length > 0 ? (
              <p className="line-clamp-2 break-words text-caption text-bodySecondary">
                {itemSummary.join(", ")}{(order.items?.length ?? 0) > itemSummary.length ? ", …" : ""}
              </p>
            ) : null}
            <p className="mt-1 text-caption text-bodySecondary">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
          </div>
          <span className="shrink-0 font-heading text-h4 font-bold text-brand-red">{formatINR(order.total)}</span>
        </div>
        {transitions.length > 0 && (
          <div className="grid grid-cols-1 gap-2 border-t border-border-default pt-3">
            {transitions.map((next) => {
              return (
                <OrderActionButton
                  key={next}
                  status={next}
                  disabled={isUpdating || updatingId === order.id}
                  isLoading={updatingId === order.id}
                  onClick={(e) => handleTransition(order.id, next, e)}
                />
              );
            })}
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
        <div className="space-y-3">
          {[...orders]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(renderOrderCard)}
        </div>
      )}
    </div>
  );
}
