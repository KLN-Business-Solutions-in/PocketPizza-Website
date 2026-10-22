"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "./client";
import { useToast } from "@/components/ui/ToastProvider";
import type {
  AdminMenuResponse,
  AdminOrderDetail,
  AdminOrderSummary,
  CreateProductRequest,
  OrderStatus,
  ReportSummaryResponse,
  ToggleStatusResponse,
  UpdateProductRequest,
  UpdateStatusRequest,
} from "@shared/contract/contract";

/**
 * Admin — Backend Master Reference §10.4–10.6, §11.7–11.9, §14, §15.
 * All JWT-guarded via __Host-admin_access cookie (credentials:include).
 * - GET/PATCH /api/v1/admin/orders
 * - GET /api/v1/admin/menu, POST/PATCH /api/v1/admin/products
 * - GET /api/v1/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Never DELETE. Status toggle only (§16.10).
 */

export type AdminOrderFilters = {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  type?: "DELIVERY" | "PICKUP" | "DINE_IN";
  page?: number;
  pageSize?: number;
};

function toSearch(f: AdminOrderFilters): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.dateFrom) p.set("dateFrom", f.dateFrom);
  if (f.dateTo) p.set("dateTo", f.dateTo);
  if (f.type) p.set("type", f.type);
  p.set("page", String(f.page ?? 1));
  p.set("pageSize", String(Math.min(f.pageSize ?? 20, 100)));
  return `?${p.toString()}`;
}

export function useAdminOrders(filters: AdminOrderFilters) {
  return useQuery<AdminOrderSummary[] | { items: AdminOrderSummary[] }>({
    queryKey: ["admin", "orders", filters],
    queryFn: () => apiFetch(`/admin/orders${toSearch(filters)}`),
    refetchInterval: 12000,
  });
}

type AdminBoardOrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED";

const ADMIN_BOARD_ORDER_STATUSES: readonly AdminBoardOrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];

function istDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function boardQueryContainsOrder(
  queryKey: readonly unknown[],
  order: AdminOrderSummary,
  status: OrderStatus,
): boolean {
  if (queryKey[2] !== status) return false;
  const typeFilter = queryKey[3];
  if (typeFilter && typeFilter !== order.orderType) return false;
  const dateFilter = queryKey[4];
  return status !== "COMPLETED" || dateFilter === istDateString(new Date(order.createdAt));
}

export function useAdminBoardOrders(type?: AdminOrderFilters["type"]) {
  const [, setMinute] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute((minute) => minute + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = istDateString(new Date());
  const results = useQueries({
    queries: ADMIN_BOARD_ORDER_STATUSES.map((status) => {
      const completedToday = status === "COMPLETED";
      const filters: AdminOrderFilters = {
        status,
        type,
        page: 1,
        pageSize: 100,
        ...(completedToday ? { dateFrom: today, dateTo: today } : {}),
      };
      return {
        queryKey: ["admin", "boardOrders", status, type ?? null, completedToday ? today : null],
        queryFn: async () => {
          const response = await apiFetch<AdminOrderSummary[] | { items: AdminOrderSummary[] }>(
            `/admin/orders${toSearch(filters)}`,
          );
          return Array.isArray(response) ? response : response.items;
        },
        refetchInterval: 12_000,
      };
    }),
  });

  return {
    NEW: results[0],
    CONFIRMED: results[1],
    PREPARING: results[2],
    READY: results[3],
    OUT_FOR_DELIVERY: results[4],
    COMPLETED: results[5],
  };
}

export function useAdminOrderDetail(id: string | undefined) {
  return useQuery<AdminOrderDetail>({
    queryKey: ["admin", "order", id],
    queryFn: () => apiFetch<AdminOrderDetail>(`/admin/orders/${id}`),
    enabled: !!id,
  });
}

/** Allowed transitions mirror §17 — enforced server-side; client pre-validates for UX. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED"],
  CONFIRMED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function useUpdateOrderStatus(orderId: string) {
  const qc = useQueryClient();
  const { push } = useToast();
  return useMutation({
    mutationFn: (body: UpdateStatusRequest) =>
      apiFetch<AdminOrderDetail>(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onMutate: async (body) => {
      const ordersQueryKey = ["admin", "orders"] as const;
      const orderQueryKey = ["admin", "order", orderId] as const;
      const boardOrdersQueryKey = ["admin", "boardOrders"] as const;

      await Promise.all([
        qc.cancelQueries({ queryKey: ordersQueryKey }),
        qc.cancelQueries({ queryKey: orderQueryKey }),
        qc.cancelQueries({ queryKey: boardOrdersQueryKey }),
      ]);

      const previousOrder = qc.getQueryData<AdminOrderDetail>(orderQueryKey);
      const previousOrders = qc.getQueriesData<
        AdminOrderSummary[] | { items: AdminOrderSummary[] }
      >({ queryKey: ordersQueryKey });
      const previousBoardOrders = qc.getQueriesData<AdminOrderSummary[]>({
        queryKey: boardOrdersQueryKey,
      });

      qc.setQueryData<AdminOrderDetail>(orderQueryKey, (current) =>
        current ? { ...current, status: body.status } : current
      );
      qc.setQueriesData<AdminOrderSummary[] | { items: AdminOrderSummary[] }>(
        { queryKey: ordersQueryKey },
        (current) => {
          if (!current) return current;
          const updateOrder = (order: AdminOrderSummary) =>
            order.id === orderId ? { ...order, status: body.status } : order;
          return Array.isArray(current)
            ? current.map(updateOrder)
            : { ...current, items: current.items.map(updateOrder) };
        }
      );

      const boardOrder = previousOrder ?? previousBoardOrders
        .flatMap(([, data]) => data ?? [])
        .find((order) => order.id === orderId);
      if (boardOrder) {
        const optimisticOrder = { ...boardOrder, status: body.status };
        previousBoardOrders.forEach(([queryKey]) => {
          qc.setQueryData<AdminOrderSummary[]>(queryKey, (current) => {
            const remaining = (current ?? []).filter((order) => order.id !== orderId);
            return boardQueryContainsOrder(queryKey, optimisticOrder, body.status)
              ? [...remaining, optimisticOrder]
              : current
                ? remaining
                : undefined;
          });
        });
      }

      return { previousOrder, previousOrders, previousBoardOrders };
    },
    onError: (_err, _body, context) => {
      if (context) {
        qc.setQueryData(["admin", "order", orderId], context.previousOrder);
        context.previousOrders.forEach(([queryKey, data]) => {
          const previousList = Array.isArray(data) ? data : data?.items ?? [];
          const previousStatus = previousList.find((order) => order.id === orderId)?.status;
          if (previousStatus === undefined) return;

          qc.setQueryData<AdminOrderSummary[] | { items: AdminOrderSummary[] }>(
            queryKey,
            (current) => {
              if (!current) return current;
              const restoreOrder = (order: AdminOrderSummary) =>
                order.id === orderId ? { ...order, status: previousStatus } : order;
              return Array.isArray(current)
                ? current.map(restoreOrder)
                : { ...current, items: current.items.map(restoreOrder) };
            }
          );
        });
        context.previousBoardOrders.forEach(([queryKey, data]) => {
          const previousBoardOrder = data?.find((order) => order.id === orderId);
          qc.setQueryData<AdminOrderSummary[]>(queryKey, (current) => {
            const remaining = (current ?? []).filter((order) => order.id !== orderId);
            return previousBoardOrder
              ? [...remaining, previousBoardOrder]
              : current
                ? remaining
                : undefined;
          });
        });
      }
      push("Failed to update order status. Reverted.", "error");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
      qc.invalidateQueries({ queryKey: ["admin", "boardOrders"] });
    },
  });
}

export function useAdminMenu() {
  return useQuery<AdminMenuResponse>({
    queryKey: ["admin", "menu"],
    queryFn: () => apiFetch<AdminMenuResponse>("/admin/menu"),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductRequest) =>
      apiFetch("/admin/products", { method: "POST", body: JSON.stringify(body) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "menu"] }),
  });
}

export function useUpdateProduct(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProductRequest) =>
      apiFetch(`/admin/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "menu"] }),
  });
}

/** Soft toggle only — never delete (§16.10). Pass productId to mutate(). */
export function useToggleProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch<ToggleStatusResponse>(`/admin/products/${productId}/status`, {
        method: "PATCH",
        body: "{}",
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "menu"] }),
  });
}

export function useReportSummary(from: string, to: string, enabled = true) {
  return useQuery<ReportSummaryResponse>({
    queryKey: ["admin", "reports", from, to],
    queryFn: () =>
      apiFetch<ReportSummaryResponse>(
        `/admin/reports/summary?from=${from}&to=${to}`
      ),
    enabled: enabled && !!from && !!to,
  });
}
