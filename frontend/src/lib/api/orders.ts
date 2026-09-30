"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { isTerminalStatus, ORDER_POLL_INTERVAL_MS } from "@/lib/order/status";
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

function postQuote(body: QuoteRequest): Promise<QuoteResponse> {
  return apiFetch<QuoteResponse>("/orders/quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function useQuote() {
  return useMutation({ mutationFn: postQuote });
}

/**
 * Day 7: a *second, independent* quote mutation used only on submit.
 *
 * It must not share state with the live checkout summary (`useOrderQuote`).
 * That hook dedupes by payload signature and deliberately refuses to re-ask for
 * an unchanged cart, which is correct while browsing and exactly wrong at the
 * moment of purchase: the sprint requires a fresh price immediately before
 * `POST /orders` so the customer can never confirm a stale one.
 */
export function usePreflightQuote() {
  return useMutation({ mutationFn: postQuote });
}

export function quotePayload(
  orderType: OrderType,
  lines: { menuItemId: string; variantId?: string; addOnIds: string[]; quantity: number }[]
): QuoteRequest {
  return {
    orderType,
    items: lines.map((l) => {
      // A standard item has no variant. `JSON.stringify` would drop an
      // `undefined` value anyway, but omitting the key here keeps the payload
      // honest in devtools and keeps the request signature stable.
      const base = { menuItemId: l.menuItemId, addOnIds: l.addOnIds ?? [], quantity: l.quantity };
      return l.variantId === undefined ? base : { ...base, variantId: l.variantId };
    }),
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

/**
 * Customer order lookup by publicToken (§11.5). cuid, not orderNumber.
 *
 * Day 7: polls while the order is still moving and stops at a terminal status,
 * so the page is a live status view rather than a one-shot receipt. The
 * callback form is required — the interval depends on the data, which is not
 * available when the query is first created.
 */
export function useOrder(publicToken: string | undefined) {
  return useQuery<OrderStatusResponse>({
    queryKey: ["order", publicToken],
    queryFn: () =>
      apiFetch<OrderStatusResponse>(`/orders/${encodeURIComponent(publicToken ?? "")}`),
    enabled: !!publicToken,
    retry: false,
    refetchInterval: (query) =>
      isTerminalStatus(query.state.data?.status) ? false : ORDER_POLL_INTERVAL_MS,
    // A status page must not keep polling in a background tab.
    refetchIntervalInBackground: false,
  });
}

export function useInvoice(publicToken: string | undefined) {
  return useQuery<InvoiceResponse>({
    queryKey: ["invoice", publicToken],
    queryFn: () =>
      apiFetch<InvoiceResponse>(`/orders/${encodeURIComponent(publicToken ?? "")}/invoice`),
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
