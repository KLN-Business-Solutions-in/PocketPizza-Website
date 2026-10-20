import type { Request } from 'express';
import {
  wrapMiddleware,
  type ExpressStyleHandler,
} from '../http/express-adapter';
import { sendError } from '../utils/response';

type Options = {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  if (buckets.size <= 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function createLimiter(options: Options): ExpressStyleHandler {
  return async (req, res, next) => {
    const now = Date.now();
    const key = `${options.message}:${
      options.keyGenerator ? options.keyGenerator(req) : req.ip ?? 'unknown'
    }`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
      prune(now);
    }

    if (bucket.count >= options.max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      sendError(res as never, 'RATE_LIMITED', options.message, 429);
      return;
    }

    await (next as unknown as () => Promise<void>)();

    if (!options.skipSuccessfulRequests || res.statusCode >= 400) {
      bucket.count += 1;
    }
  };
}

export const globalRateLimit = wrapMiddleware(
  createLimiter({ windowMs: 15 * 60 * 1000, max: 1000, message: 'Too many requests' }),
);

export const loginRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts',
    keyGenerator: (req) => {
      const raw = (req.body as { email?: unknown } | undefined)?.email;
      const email = typeof raw === 'string' ? raw.toLowerCase().trim() : 'unknown';
      return `${req.ip}:${email}`;
    },
  }),
);

export const orderCreateRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'Too many order attempts',
  }),
);

export const tokenLookupRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many order lookup attempts',
  }),
);

export const phoneOrdersIpRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Too many order lookup attempts',
  }),
);

export const phoneOrdersPhoneRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many order lookup attempts',
    keyGenerator: (req) => `${req.ip}:${phoneRateLimitKey(req.params.phone)}`,
  }),
);

export const refreshRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many refresh attempts',
  }),
);

export const customerSignupRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many signup attempts',
  }),
);

export function phoneRateLimitKey(raw: unknown): string {
  if (typeof raw !== 'string') return 'unknown';
  const digits = raw.replace(/\D/g, '');
  return digits.length > 0 ? digits.slice(-10) : 'unknown';
}

export const customerLoginRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many login attempts',
    keyGenerator: (req) =>
      `${req.ip}:${phoneRateLimitKey((req.body as { phone?: unknown } | undefined)?.phone)}`,
    skipSuccessfulRequests: true,
  }),
);

export const customerLoginIpRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many login attempts',
    skipSuccessfulRequests: true,
  }),
);

export const customerLoginPhoneRateLimit = wrapMiddleware(
  createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many login attempts',
    keyGenerator: (req) =>
      phoneRateLimitKey((req.body as { phone?: unknown } | undefined)?.phone),
    skipSuccessfulRequests: true,
  }),
);
