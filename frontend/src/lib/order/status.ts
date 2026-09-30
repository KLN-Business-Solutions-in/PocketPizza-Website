import type { OrderStatus, OrderType } from "@shared/contract/contract";

/**
 * Day 7: customer-facing vocabulary for the order and invoice screens.
 *
 * Lives in one place because three pages render the same two enums and the raw
 * values must never leak to a customer — `OUT_FOR_DELIVERY` and `PAY_AT_STORE`
 * are database vocabulary, not English. Also holds the polling policy for the
 * status page so "when do we stop asking" is a single decision.
 */

/** How often the status page re-asks while an order is still moving. */
export const ORDER_POLL_INTERVAL_MS = 15_000;

const TERMINAL: ReadonlySet<OrderStatus> = new Set<OrderStatus>(["COMPLETED", "CANCELLED"]);

export function isTerminalStatus(status: OrderStatus | undefined): boolean {
  return status !== undefined && TERMINAL.has(status);
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Order received",
  CONFIRMED: "Confirmed",
  PREPARING: "In the kitchen",
  READY: "Ready",
  OUT_FOR_DELIVERY: "On the way",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Short headline for the order status pill. */
export function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status] ?? status;
}

/** One reassuring sentence under the headline. */
export function statusHint(status: OrderStatus, orderType: OrderType): string {
  switch (status) {
    case "NEW":
      return "We've got your order and are confirming it now.";
    case "CONFIRMED":
      return orderType === "DELIVERY"
        ? "We're getting your pizza ready."
        : "Your order is confirmed — come to the store when you're ready.";
    case "PREPARING":
      return "Your pizza is in the oven.";
    case "READY":
      return orderType === "DELIVERY"
        ? "Packed and waiting for the rider."
        : "Ready for pickup at the store.";
    case "OUT_FOR_DELIVERY":
      return "On the way to you.";
    case "COMPLETED":
      return "Enjoy. Thanks for ordering from Pokket Pizza!";
    case "CANCELLED":
      return "This order was cancelled. If that wasn't expected, please call the store.";
    default:
      return "";
  }
}

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DELIVERY: "Home delivery",
  PICKUP: "Pickup from store",
  DINE_IN: "Dine in",
};

export function orderTypeLabel(orderType: OrderType): string {
  return ORDER_TYPE_LABEL[orderType] ?? orderType;
}

/**
 * The sprint's "pay at store / cash on delivery" note.
 *
 * Derived from `orderType` alone, deliberately: `OrderStatusResponse` carries no
 * `paymentMethod`, so reading it off the invoice would make the confirmation
 * screen depend on a second request and silently drop the note when that
 * request fails. See DAYS-6-7-REMAINING.md 7.R3.
 */
export function paymentNote(orderType: OrderType): string {
  return orderType === "DELIVERY"
    ? "Pay cash on delivery."
    : "Pay at the store when you collect or when you sit down.";
}

const TIMESTAMP = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatOrderTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : TIMESTAMP.format(date);
}
