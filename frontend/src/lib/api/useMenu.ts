"use client";

import { useQuery } from "@tanstack/react-query";
import { useMockReady } from "@/components/ui/MSWProvider";
import { ApiError, getMenu, getProduct } from "@/lib/api";
import type {
  Category,
  MenuItem,
  MenuResponse,
  ProductDetailResponse,
} from "@shared/contract/contract";

const MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error instanceof ApiError) {
    if (error.code === "CONTRACT_MISMATCH") return false;
    return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
}

/**
 * Public menu — Backend Master Reference §10, §15.
 * GET /api/v1/menu → { categories: [{ id, name, sortOrder, items: [...] }] }
 * Only active items are returned by the server. Money is decimal strings.
 */
export function useMenu() {
  const mockReady = useMockReady();

  return useQuery<MenuResponse>({
    queryKey: ["menu", MOCK_MODE ? "mock" : "live"],
    queryFn: ({ signal }) => getMenu(signal),
    enabled: mockReady,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    retry: shouldRetry,
  });
}

export function useMenuFlat() {
  const q = useMenu();
  const categories: Category[] = [...(q.data?.categories ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );
  const products: MenuItem[] = categories.flatMap((category) => category.items);
  return { ...q, categories, products };
}

/** GET /api/v1/products/:id — CUID validated server-side (§10.3). */
export function useProduct(id: string | undefined) {
  const mockReady = useMockReady();

  return useQuery<ProductDetailResponse>({
    queryKey: ["product", id, MOCK_MODE ? "mock" : "live"],
    queryFn: ({ signal }) => {
      if (!id) throw new Error("A product id is required.");
      return getProduct(id, signal);
    },
    enabled: !!id && mockReady,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    retry: shouldRetry,
  });
}
