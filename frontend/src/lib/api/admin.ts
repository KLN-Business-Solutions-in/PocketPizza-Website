"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
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

function invalidatePublicMenu(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["menu"] });
  void qc.invalidateQueries({ queryKey: ["product"] });
}

export function useAdminOrders(filters: AdminOrderFilters) {
  return useQuery<AdminOrderSummary[] | { items: AdminOrderSummary[] }>({
    queryKey: ["admin", "orders", filters],
    queryFn: () => apiFetch(`/admin/orders${toSearch(filters)}`),
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
  return useMutation({
    mutationFn: (body: UpdateStatusRequest) =>
      apiFetch<AdminOrderDetail>(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
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
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "menu"] });
      invalidatePublicMenu(qc);
    },
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
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "menu"] });
      invalidatePublicMenu(qc);
    },
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
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "menu"] });
      invalidatePublicMenu(qc);
    },
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