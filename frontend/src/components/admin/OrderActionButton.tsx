import React from "react";
import type { OrderStatus, OrderType } from "@shared/contract/contract";
import { ALLOWED_TRANSITIONS } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";

export const TRANSITION_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  CONFIRMED: "Confirm",
  PREPARING: "Start Preparing",
  READY: "Mark Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
};

export function getOrderTransitions(status: OrderStatus, orderType: OrderType): OrderStatus[] {
  return ALLOWED_TRANSITIONS[status].filter((next) => {
    if (next === "OUT_FOR_DELIVERY" && orderType !== "DELIVERY") return false;
    if (next === "COMPLETED" && status === "READY" && orderType === "DELIVERY") return false;
    return true;
  });
}

type OrderActionButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  status: OrderStatus;
  isLoading?: boolean;
  label?: string;
  tone?: "status" | "success";
};

export function OrderActionButton({
  status,
  label,
  tone = "status",
  className = "",
  ...props
}: OrderActionButtonProps) {
  const isCancel = status === "CANCELLED";
  const isSuccess = tone === "success";

  return (
    <Button
      {...props}
      size="sm"
      variant={isCancel ? "outline" : "primary"}
      className={`h-10 w-full min-w-0 whitespace-nowrap rounded-lg border border-brand-red px-4 py-2 text-sm font-semibold leading-5 text-center ${
        isSuccess
          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
          : isCancel
            ? "bg-white text-brand-red hover:bg-blushTint"
            : "bg-brand-red text-white hover:bg-red-700"
      } ${className}`}
    >
      {label ?? TRANSITION_LABELS[status]}
    </Button>
  );
}
