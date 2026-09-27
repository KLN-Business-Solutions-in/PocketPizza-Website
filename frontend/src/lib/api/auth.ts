"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { LoginRequest } from "@shared/contract/contract";

export type AdminMe = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Auth — Backend Master Reference §9, §15, §20.
 * - POST /api/v1/auth/login   (sets __Host- cookies, returns { admin })
 * - POST /api/v1/auth/refresh (cookie-only, rotates)
 * - POST /api/v1/auth/logout  (revokes)
 * No token in JS. credentials:include is set in apiFetch. No localStorage.
 */

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiFetch<{ admin: AdminMe }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSettled: () => {
      // Refresh session cache so navigation doesn't reuse stale unauthenticated result
      qc.invalidateQueries({ queryKey: ["admin", "session"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminRefresh() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ admin: AdminMe }>("/auth/refresh", { method: "POST", body: "{}" }),
  });
}

export function useAdminLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ success?: boolean }>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

/**
 * Lightweight session probe: admin-only endpoint. 401 → not logged in.
 * Uses GET /api/v1/admin/orders?pageSize=1 as the guard (no dedicated /me in MVP).
 */
export function useAdminSession() {
  return useQuery({
    queryKey: ["admin", "session"],
    queryFn: async (): Promise<{ ok: boolean }> => {
      try {
        await apiFetch("/admin/orders?page=1&pageSize=1");
        return { ok: true };
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err?.status === 401) return { ok: false };
        throw e;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}
