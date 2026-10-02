"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useAdminOrderDetail(id: string | undefined) {
  return useQuery<AdminOrderDetail>({
    queryKey: ["admin", "order", id],
    queryFn: () => apiFetch<AdminOrderDetail>(`/admin/orders/${id}`),
    enabled: !!id,
  });
}

/** Allowed transitions mirror §17 — enforced server-side; client pre-validates for UX. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
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

      await Promise.all([
        qc.cancelQueries({ queryKey: ordersQueryKey }),
        qc.cancelQueries({ queryKey: orderQueryKey }),
      ]);

      const previousOrder = qc.getQueryData<AdminOrderDetail>(orderQueryKey);
      const previousOrders = qc.getQueriesData<
        AdminOrderSummary[] | { items: AdminOrderSummary[] }
      >({ queryKey: ordersQueryKey });

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

      return { previousOrder, previousOrders };
    },
    onError: (_err, _body, context) => {
      if (context) {
        qc.setQueryData(["admin", "order", orderId], context.previousOrder);
        context.previousOrders.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data);
        });
      }
      push("Failed to update order status. Reverted.", "error");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
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
