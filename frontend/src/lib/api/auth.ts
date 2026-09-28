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
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiFetch<{ admin: AdminMe }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
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
 *
 * IMPORTANT: Only a genuine 401 AUTHENTICATION_REQUIRED signals "not logged in."
 * A 404 (endpoint not yet built on backend), 500, or network error must NOT
 * redirect to login — those are backend/infra issues, not auth failures.
 *
 * MOCK MODE: When NEXT_PUBLIC_USE_MOCKS=true, the session probe is skipped
 * entirely — MSW module-level state resets on Next.js navigations, making
 * cookie/session simulation unreliable. Route protection in mock mode is
 * intentionally relaxed; real cookie enforcement happens on the live backend.
 */
export function useAdminSession() {
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

  return useQuery({
    queryKey: ["admin", "session"],
    queryFn: async (): Promise<{ ok: boolean }> => {
      // In mock mode: skip the probe — always report session as active.
      // MSW cannot reliably read the real backend's cross-origin HttpOnly
      // cookies, so route protection must be relaxed in mock mode.
      if (isMockMode) {
        return { ok: true };
      }

      try {
        await apiFetch("/admin/orders?page=1&pageSize=1");
        return { ok: true };
      } catch (e: unknown) {
        const err = e as { status?: number; code?: string };
        // Only treat a real 401 AUTHENTICATION_REQUIRED as "not logged in".
        // 404 = backend endpoint not built yet → treat as ok (don't redirect).
        // 500/network = infra error → treat as ok (don't redirect).
        if (
          err?.status === 401 &&
          (err?.code === "AUTHENTICATION_REQUIRED" || err?.code === "AUTHENTICATION_INVALID")
        ) {
          return { ok: false };
        }
        // Any other error: resolve as ok:true so dashboard renders its own error state.
        return { ok: true };
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}
