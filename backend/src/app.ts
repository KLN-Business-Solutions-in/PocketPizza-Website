import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config/env';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';
import { globalRateLimit } from './middleware/rateLimit.middleware';
import { requireAdmin, requireCustomer } from './middleware/auth.middleware';
import { sendSuccess } from './utils/response';
import { getPrisma, isWorkersRuntime, runWithRequestDatabase } from './config/database';
import { getRequestId, handleNotFound, wrap, wrapMiddleware } from './http/express-adapter';
import { menuRouter } from './modules/menu/menu.routes';
import { authRouter } from './modules/auth/auth.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { orderRouter } from './modules/orders/order.routes';
import { restaurantRouter } from './modules/restaurant/restaurant.routes';
import { twilioWebhookRouter } from './modules/notifications/notification.routes';
import { customerRouter } from './modules/customer/customer.routes';

// access logs must never carry capability tokens: publicToken sits in the
// path (/orders/:token[/invoice]) and legacy links put it in ?token=.
// Phone numbers ride the same router (/orders/phone/:phone) and are PII — the
// phone rule runs last, after the token rule has spared the literal segment.
function sanitizeLogUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url
    .replace(/\/orders\/(?!quote(?:[/?#]|$)|phone(?:[/?#]|$))[^/?#]+/g, '/orders/[redacted]')
    .replace(/\/orders\/phone\/[^/?#]+/g, '/orders/phone/[redacted]')
    .replace(/([?&]token=)[^&]+/gi, '$1[redacted]');
}

const allowedOrigins = new Set(
  env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const app = new Hono();

// Each Workers request owns its database client: pooled I/O cannot be reused
// across request contexts in workerd.
app.use('*', async (_c, next) => {
  if (!isWorkersRuntime) return next();
  return runWithRequestDatabase(next);
});

app.use('*', secureHeaders());

app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : ''),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// request id + structured access log (tokens and phones redacted)
app.use('*', async (c, next) => {
  const id = getRequestId(c);
  const startedAt = Date.now();
  try {
    await next();
  } finally {
    const url = new URL(c.req.url);
    logger.info(
      {
        req: {
          id,
          method: c.req.method,
          url: sanitizeLogUrl(`${url.pathname}${url.search}`),
          remoteAddress: c.req.header('cf-connecting-ip') ?? undefined,
        },
        res: { statusCode: c.res?.status ?? 500 },
        responseTime: Date.now() - startedAt,
      },
      'request completed',
    );
  }
});

app.use('*', globalRateLimit);

app.get(
  '/health',
  wrap((_req, res) => {
    sendSuccess(res, { status: 'ok' });
  }),
);

app.get(
  '/health/db',
  wrapMiddleware(requireAdmin),
  wrap(async (_req, res) => {
    const prisma = await getPrisma();

    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true, name: true, phone: true },
    });

    const [categoryCount, menuItemCount, customerCount] = await Promise.all([
      prisma.category.count(),
      prisma.menuItem.count(),
      prisma.customer.count(),
    ]);

    sendSuccess(res, {
      connected: true,
      restaurant,
      counts: {
        categories: categoryCount,
        menuItems: menuItemCount,
        customers: customerCount,
      },
    });
  }),
);

app.route('/api/v1/auth', authRouter);

app.use('/api/v1/admin/*', wrapMiddleware(requireAdmin));
app.route('/api/v1/admin', adminRouter);

app.use('/api/v1/customer/*', wrapMiddleware(requireCustomer));
app.route('/api/v1/customer', customerRouter);

app.route('/api/v1', menuRouter);
app.route('/api/v1', orderRouter);
app.route('/api/v1', restaurantRouter);

// Twilio status callbacks live outside /api/v1 and are signed, not cookie-authed
app.route('/api/webhooks', twilioWebhookRouter);

app.notFound(handleNotFound);

app.onError((err, c) => {
  const requestId = getRequestId(c);
  const status = err instanceof AppError ? err.httpStatus : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message =
    err instanceof AppError
      ? err.message
      : env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

  if (!(err instanceof AppError)) {
    logger.error({ err, requestId }, 'Unhandled error');
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        ...(err instanceof AppError && err.details ? { details: err.details } : {}),
      },
      requestId,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
});

export { app };
