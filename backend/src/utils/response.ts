import { Response } from 'express';
import crypto from 'crypto';

type ErrorDetails = string[];

function setRequestIdHeader(res: Response, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
}

function resolveRequestId(requestId?: string, fallback?: string): string {
  if (requestId && requestId.trim().length > 0) return requestId;
  if (fallback && fallback.trim().length > 0) return fallback;
  return crypto.randomUUID();
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const requestId = resolveRequestId(undefined, String(res.req.id ?? ''));
  setRequestIdHeader(res, requestId);
  res.status(status).json({
    success: true,
    data,
    requestId,
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  status: number,
  details?: ErrorDetails,
  requestId?: string,
): void {
  const resolvedRequestId = resolveRequestId(requestId, String(res.req.id ?? ''));
  const hasDetails = Array.isArray(details) && details.length > 0;
  setRequestIdHeader(res, resolvedRequestId);
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(hasDetails && { details }),
    },
    requestId: resolvedRequestId,
  });
}
