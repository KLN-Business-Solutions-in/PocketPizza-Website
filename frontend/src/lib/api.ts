"use client";

import {
  MenuResponseSchema,
  ProductDetailResponseSchema,
  type MenuResponse,
  type ProductDetailResponse,
} from "@shared/contract/contract";
import { apiFetch } from "./api/client";

export { ApiError, ContractMismatchError, API_BASE, apiFetch, apiUrl } from "./api/client";
export type { ApiErrorShape } from "./api/client";

/** GET /api/v1/menu — typed and runtime-validated against the frozen shared contract. */
export function getMenu(signal?: AbortSignal): Promise<MenuResponse> {
  return apiFetch<MenuResponse>("/menu", { signal }, MenuResponseSchema);
}

/** GET /api/v1/products/:id — typed and runtime-validated against the frozen shared contract. */
export function getProduct(id: string, signal?: AbortSignal): Promise<ProductDetailResponse> {
  return apiFetch<ProductDetailResponse>(
    `/products/${encodeURIComponent(id)}`,
    { signal },
    ProductDetailResponseSchema
  );
}
