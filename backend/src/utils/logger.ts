import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    'req.headers.cookie',
    'req.headers.authorization',
    '*.password',
    '*.passwordHash',
    '*.token',
    '*.refreshToken',
    '*.accessToken',
  ],
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});

export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}
