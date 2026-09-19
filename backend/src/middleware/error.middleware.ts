import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger({ module: 'error-handler' });

const PRISMA_ERROR_MAP: Record<string, { status: number; code: string }> = {
  P2002: { status: 409, code: 'CONFLICT' },
  P2025: { status: 404, code: 'NOT_FOUND' },
  P2003: { status: 409, code: 'FOREIGN_KEY_VIOLATION' },
};

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = String(req.id ?? '');

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details, requestId);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.httpStatus, undefined, requestId);
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: Record<string, unknown> };
    const mapped = PRISMA_ERROR_MAP[prismaErr.code];
    if (mapped) {
      sendError(res, mapped.code, mapped.code === 'NOT_FOUND' ? 'Resource not found' : 'Conflict', mapped.status, undefined, requestId);
      return;
    }
  }

  logger.error({ requestId, code: 'INTERNAL_ERROR', path: req.path, method: req.method }, 'Unhandled error');

  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  sendError(res, 'INTERNAL_ERROR', message, 500, undefined, requestId);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404, undefined, String(req.id));
}
