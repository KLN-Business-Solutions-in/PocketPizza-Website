import type { ErrorEnvelope, SuccessEnvelope } from "@shared/contract/contract";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: ErrorEnvelope["error"]["details"];
  requestId?: string;

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    details?: ErrorEnvelope["error"]["details"];
    requestId?: string;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.requestId = opts.requestId;
  }
}

/**
 * Typed fetch wrapper per Backend Master Reference §8.
 * - Reads NEXT_PUBLIC_API_BASE_URL from environment variables.
 * - Parses shared success envelope ({ success: true, data, requestId }).
 * - Parses shared error envelope ({ success: false, error: { code, message, details }, requestId }).
 * - Logs requestId to console on any error response for debugging.
 * - Uses shared request/response types from @shared/contract/contract.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth: _auth, ...rest } = init;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${baseUrl}${cleanPath}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(rest.headers || {}),
      },
    });
  } catch (networkErr: unknown) {
    console.error("[API Client] Network request failed:", networkErr);
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Network request failed. Please check your connection.",
      status: 0,
    });
  }

  let json: SuccessEnvelope<T> | ErrorEnvelope;
  try {
    json = (await res.json()) as SuccessEnvelope<T> | ErrorEnvelope;
  } catch {
    console.error(`[API Client] Invalid JSON response (HTTP ${res.status}) from ${url}`);
    throw new ApiError({
      code: "INTERNAL_ERROR",
      message: `Unexpected response format (HTTP ${res.status}).`,
      status: res.status,
    });
  }

  if (json && json.success === true) {
    return json.data;
  }

  const errorEnvelope = json as ErrorEnvelope;
  const requestId = errorEnvelope?.requestId ?? "N/A";
  console.error(`[API Client] Request Error [requestId: ${requestId}]:`, {
    code: errorEnvelope?.error?.code,
    message: errorEnvelope?.error?.message,
    details: errorEnvelope?.error?.details,
    status: res.status,
    url,
  });

  const code = errorEnvelope?.error?.code ?? "INTERNAL_ERROR";
  const message = errorEnvelope?.error?.message || `Request failed (HTTP ${res.status}).`;

  // Global 401 Interceptor: If we get a genuine AUTHENTICATION_REQUIRED from any admin API call,
  // we perform a hard redirect to the login page. A hard redirect (window.location.href) 
  // automatically clears all in-memory local state (React Query cache, etc.) and ensures a clean slate.
  if (res.status === 401 && code === "AUTHENTICATION_REQUIRED") {
    if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
      window.location.href = "/admin/login?reason=expired";
      // We still throw to prevent the caller from continuing execution
    }
  }

  throw new ApiError({
    code,
    message,
    status: res.status,
    details: errorEnvelope?.error?.details,
    requestId,
  });
}

export function apiUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
