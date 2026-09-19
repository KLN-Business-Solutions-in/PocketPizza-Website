import { Response } from 'express';

type ErrorDetails = string[] | Record<string, unknown>;

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const requestId = String(res.req.id ?? '');
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
  const hasDetails = Array.isArray(details) ? details.length > 0 : details !== undefined;
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(hasDetails && { details }),
    },
    requestId: requestId ?? String(res.req.id ?? ''),
  });
}
