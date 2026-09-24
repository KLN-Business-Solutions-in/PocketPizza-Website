import { Response } from 'express';

type ErrorDetails = string[];

function setRequestIdHeader(res: Response, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const requestId = String(res.req.id ?? '');
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
  const resolvedRequestId = requestId ?? String(res.req.id ?? '');
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
