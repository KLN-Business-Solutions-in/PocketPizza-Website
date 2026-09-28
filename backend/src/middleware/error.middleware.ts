import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { createChildLogger } from '../utils/logger';
import { env } from '../config/env';

const logger = createChildLogger({ module: 'error-handler' });

const PRISMA_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  P2002: { status: 409, code: 'CONFLICT', message: 'Conflict' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
  P2003: { status: 409, code: 'FOREIGN_KEY_VIOLATION', message: 'Conflict' },
  // numeric overflow surfaces as P2020/P2010 depending on adapter — must not become a 500
  P2020: { status: 400, code: 'VALIDATION_ERROR', message: 'Value out of range' },
  P2010: { status: 400, code: 'VALIDATION_ERROR', message: 'Value out of range' },
};

// Contract schemas resolve root zod@4 while backend uses nested zod@3 —
// instanceof fails across package copies, so duck-type as well.
function isZodError(err: unknown): err is ZodError {
  if (err instanceof ZodError) return true;
  return (
    err instanceof Error &&
    err.name === 'ZodError' &&
    Array.isArray((err as ZodError).issues)
  );
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = String(req.id ?? '');
  res.setHeader('Cache-Control', 'no-store');

  if (isZodError(err)) {
    const details = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details, requestId);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.httpStatus, err.details, requestId);
    return;
  }

  const parserType = (err as { type?: string }).type;
  if (parserType === 'entity.parse.failed') {
    sendError(res, 'INVALID_JSON', 'Malformed JSON in request body', 400, undefined, requestId);
    return;
  }
  if (parserType === 'entity.too.large') {
    sendError(res, 'PAYLOAD_TOO_LARGE', 'Request body too large', 413, undefined, requestId);
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: Record<string, unknown> };
    const mapped = PRISMA_ERROR_MAP[prismaErr.code];
    if (mapped) {
      sendError(res, mapped.code, mapped.message, mapped.status, undefined, requestId);
      return;
    }
  }

  logger.error({ requestId, code: 'INTERNAL_ERROR', path: req.path, method: req.method }, 'Unhandled error');

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  sendError(res, 'INTERNAL_ERROR', message, 500, undefined, requestId);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404, undefined, String(req.id));
}
