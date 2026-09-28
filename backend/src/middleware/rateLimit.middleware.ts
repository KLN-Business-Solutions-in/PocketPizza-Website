import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

function rateLimitBody(message: string) {
  return (req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message },
      requestId: String(req.id ?? ''),
    });
  };
}

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many requests'),
});

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const raw = req.body?.email;
    const email = typeof raw === 'string' ? raw.toLowerCase().trim() : 'unknown';
    return `${req.ip}:${email}`;
  },
  handler: rateLimitBody('Too many login attempts'),
});

export const orderCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many order attempts'),
});

export const tokenLookupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many order lookup attempts'),
});

export const refreshRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many refresh attempts'),
});
