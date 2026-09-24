"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export type ApiErrorShape = {
  code: string;
  message: string;
  details?: { field?: string; message: string }[] | string[];
};

export class ApiError extends Error {
  code: string;
  status: number;
  details?: ApiErrorShape["details"];
  requestId?: string;
  constructor(opts: {
    code: string;
    message: string;
    status: number;
    details?: ApiErrorShape["details"];
    requestId?: string;
  }) {
    super(opts.message);
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.requestId = opts.requestId;
  }
}

type EnvelopeSuccess<T> = { success: true; data: T; requestId: string };
type EnvelopeError = {
  success: false;
  error: ApiErrorShape;
  requestId: string;
};

async function parseEnvelope<T>(res: Response): Promise<T> {
  let json: EnvelopeSuccess<T> | EnvelopeError;
  try {
    json = (await res.json()) as EnvelopeSuccess<T> | EnvelopeError;
  } catch {
    throw new ApiError({
      code: "INTERNAL_ERROR",
      message: `Unexpected response (HTTP ${res.status}). Please try again.`,
      status: res.status,
    });
  }
  if (json && (json as EnvelopeSuccess<T>).success === true) {
    return (json as EnvelopeSuccess<T>).data;
  }
  const err = json as EnvelopeError;
  throw new ApiError({
    code: err?.error?.code ?? "INTERNAL_ERROR",
    message: err?.error?.message || `Request failed (HTTP ${res.status}).`,
    status: res.status,
    details: err?.error?.details,
    requestId: err?.requestId,
  });
}

/**
 * Canonical fetch wrapper per Backend Master Reference §8.
 * - Envelope-aware ({ success, data, requestId })
 * - Sends cookies (required for admin JWT via __Host- cookies, §9.8/§20.1)
 * - Never sends client-computed totals; server recomputes pricing (§16.2)
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth: _auth, ...rest } = init;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    // Admin + auth endpoints rely on HttpOnly cookies; always include.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
  });
  return parseEnvelope<T>(res);
}

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}
