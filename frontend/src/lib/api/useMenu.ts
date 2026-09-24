"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  Category,
  MenuItem,
  MenuResponse,
  ProductDetailResponse,
} from "@shared/contract/contract";

/**
 * Public menu — Backend Master Reference §10, §15.
 * GET /api/v1/menu → { categories: [{ id, name, sortOrder, items: [...] }] }
 * Only active items are returned by the server. Money is decimal strings.
 */
export function useMenu() {
  return useQuery<MenuResponse>({
    queryKey: ["menu"],
    queryFn: () => apiFetch<MenuResponse>("/menu"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMenuFlat() {
  const q = useMenu();
  const categories: Category[] = q.data?.categories ?? [];
  const products: MenuItem[] = categories.flatMap((c) => c.items ?? []);
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  return { ...q, categories: sorted, products };
}

/** GET /api/v1/products/:id — CUID validated server-side (§10.3). */
export function useProduct(id: string | undefined) {
  return useQuery<ProductDetailResponse>({
    queryKey: ["product", id],
    queryFn: () => apiFetch<ProductDetailResponse>(`/products/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
