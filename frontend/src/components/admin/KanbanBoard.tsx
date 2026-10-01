"use client";

import React from "react";
import type { OrderStatus, OrderType } from "@shared/contract/contract";
import { formatINR } from "@/lib/money";
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
  items?: Array<{ quantity: number }>;
};

interface KanbanBoardProps {
  orders: KanbanOrder[];
  onSelectOrder?: (id: string) => void;
  selectedId?: string | null;
  onUpdateStatus?: (id: string, status: OrderStatus) => Promise<void> | void;
  isUpdating?: boolean;
}

const KANBAN_COLUMNS: { status: OrderStatus; label: string; headerBg: string; badgeColor: string }[] = [
  { status: "NEW", label: "New", headerBg: "bg-amber-100 text-amber-900 border-amber-300", badgeColor: "bg-amber-500 text-white" },
  { status: "CONFIRMED", label: "Confirmed", headerBg: "bg-blue-100 text-blue-900 border-blue-300", badgeColor: "bg-blue-500 text-white" },
  { status: "PREPARING", label: "Preparing", headerBg: "bg-purple-100 text-purple-900 border-purple-300", badgeColor: "bg-purple-500 text-white" },
  { status: "READY", label: "Ready", headerBg: "bg-teal-100 text-teal-900 border-teal-300", badgeColor: "bg-teal-500 text-white" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", headerBg: "bg-sky-100 text-sky-900 border-sky-300", badgeColor: "bg-sky-500 text-white" },
  { status: "COMPLETED", label: "Completed", headerBg: "bg-emerald-100 text-emerald-900 border-emerald-300", badgeColor: "bg-emerald-500 text-white" },
  { status: "CANCELLED", label: "Cancelled", headerBg: "bg-rose-100 text-rose-900 border-rose-300", badgeColor: "bg-rose-500 text-white" },
];

/**
 * Mirror allow-list rules per Day 8 specification:
 * - NEW: [CONFIRMED, CANCELLED]
 * - CONFIRMED: [PREPARING, CANCELLED]
 * - PREPARING: [READY, CANCELLED]
 * - READY: [OUT_FOR_DELIVERY (if DELIVERY), COMPLETED (if not DELIVERY), CANCELLED]
 * - OUT_FOR_DELIVERY: [COMPLETED, CANCELLED]
 * - COMPLETED: []
 * - CANCELLED: []
 */
function getValidTransitions(status: OrderStatus, orderType: OrderType): OrderStatus[] {
  switch (status) {
    case "NEW":
      return ["CONFIRMED", "CANCELLED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];
    case "PREPARING":
      return ["READY", "CANCELLED"];
    case "READY":
      if (orderType === "DELIVERY") {
        return ["OUT_FOR_DELIVERY", "CANCELLED"];
      }
      return ["COMPLETED", "CANCELLED"];
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED", "CANCELLED"];
    case "COMPLETED":
    case "CANCELLED":
    default:
      return [];
  }
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1200px]">
        {KANBAN_COLUMNS.map((col) => {
          const columnOrders = orders.filter((o) => o.status === col.status);
          return (
            <div
              key={col.status}
              className="flex-1 min-w-[240px] max-w-[300px] flex flex-col rounded-xl border bg-gray-50/50 p-3 shadow-sm"
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border font-heading font-semibold text-caption mb-3 ${col.headerBg}`}>
                <span>{col.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeColor}`}>
                  {columnOrders.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {columnOrders.length === 0 ? (
                  <div className="h-24 flex items-center justify-center rounded-lg border border-dashed text-caption text-gray-400">
                    No orders
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const isSelected = selectedId === order.id;
                    const transitions = getValidTransitions(order.status, order.orderType);
                    const itemCount = order.items
                      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                      : 1;

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
                        className={`group relative flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                          isSelected ? "ring-2 ring-brand-red border-transparent" : "border-gray-200"
                        }`}
                      >
                        {/* Order Header: Number & Time */}
                        <div className="flex items-center justify-between text-caption border-b pb-1.5 border-gray-100">
                          <span className="font-bold text-gray-900">{order.orderNumber}</span>
                          <span className="text-gray-500 font-medium text-xs">{formatTime(order.createdAt)}</span>
                        </div>

                        {/* Customer Info */}
                        <div className="text-body text-xs text-gray-700 font-medium">
                          <p className="truncate font-semibold text-gray-900">{order.customer.name}</p>
                          <p className="text-gray-500">{order.customer.phone}</p>
                        </div>

                        {/* Badges: Type, Item Count, Total */}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-1">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                            {order.orderType}
                          </span>
                          <span className="text-gray-500">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                          <span className="font-bold text-gray-900">{formatINR(order.total)}</span>
                        </div>

                        {/* Transition Buttons */}
                        {transitions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 mt-1">
                            {transitions.map((next) => {
                              const isCancel = next === "CANCELLED";
                              return (
                                <Button
                                  key={next}
                                  size="sm"
                                  variant={isCancel ? "danger" : "outline"}
                                  disabled={isUpdating || updatingId === order.id}
                                  isLoading={updatingId === order.id}
                                  onClick={(e) => handleTransition(order.id, next, e)}
                                  className={`flex-1 text-xs py-1 px-2 h-7 ${
                                    !isCancel
                                      ? "bg-brand-red text-white hover:bg-red-700 border-brand-red"
                                      : ""
                                  }`}
                                >
                                  → {next.replaceAll("_", " ")}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
