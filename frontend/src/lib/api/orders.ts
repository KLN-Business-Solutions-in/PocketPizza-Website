"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  InvoiceResponse,
  OrderStatusResponse,
  OrderType,
  QuoteRequest,
  QuoteResponse,
} from "@shared/contract/contract";

/**
 * Orders — Backend Master Reference §11, §15, §16, §18, §19.
 * - POST /api/v1/orders/quote (server pricing, same engine as create)
 * - POST /api/v1/orders (transactional, idempotencyKey uuid v4)
 * - GET  /api/v1/orders/:publicToken (NOT orderNumber)
 * - GET  /api/v1/orders/:publicToken/invoice
 */

export function useQuote() {
  return useMutation({
    mutationFn: (body: QuoteRequest) =>
      apiFetch<QuoteResponse>("/orders/quote", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function quotePayload(
  orderType: OrderType,
  lines: { menuItemId: string; variantId?: string; addOnIds: string[]; quantity: number }[]
): QuoteRequest {
  // Deliberately map only server-owned inputs; displayName/displayPrice are
  // never part of the request and never become authoritative totals.
  return {
    orderType,
    items: lines.map((l) => ({
      menuItemId: l.menuItemId,
      variantId: l.variantId,
      addOnIds: l.addOnIds ?? [],
      quantity: l.quantity,
    })),
  };
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (body: CreateOrderRequest) =>
      apiFetch<CreateOrderResponse>("/orders", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

/** Customer order lookup by publicToken (§11.5). cuid, not orderNumber. */
export function useOrder(publicToken: string | undefined) {
  return useQuery<OrderStatusResponse>({
    queryKey: ["order", publicToken],
    queryFn: () => apiFetch<OrderStatusResponse>(`/orders/${publicToken}`),
    enabled: !!publicToken,
    retry: false,
  });
}

export function useInvoice(publicToken: string | undefined) {
  return useQuery<InvoiceResponse>({
    queryKey: ["invoice", publicToken],
    queryFn: () =>
      apiFetch<InvoiceResponse>(`/orders/${publicToken}/invoice`),
    enabled: !!publicToken,
    retry: false,
  });
}

/** Fresh uuid v4 per checkout attempt for §19 idempotency. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
