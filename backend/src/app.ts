import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { globalRateLimit } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { sendSuccess } from './utils/response';
import { ah } from './utils/async-handler';
import { getPrisma } from './config/database';
import { menuRouter } from './modules/menu/menu.routes';
import { authRouter } from './modules/auth/auth.routes';
import { requireAdmin } from './middleware/auth.middleware';
import { adminRouter } from './modules/admin/admin.routes';
import { orderRouter } from './modules/orders/order.routes';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);

app.use(express.json({ limit: '100kb' }));

app.use(cookieParser());

app.use((req, _res, next) => {
  req.id = `req_${crypto.randomUUID().slice(0, 12)}`;
  next();
});

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id ?? `req_${crypto.randomUUID().slice(0, 12)}`,
    redact: ['req.headers.cookie', 'req.headers.authorization'],
  }),
);

app.use(globalRateLimit);

app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

app.get(
  '/health/db',
  ah(async (_req, res) => {
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

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', requireAdmin, adminRouter);
app.use('/api/v1', menuRouter);
app.use('/api/v1', orderRouter);

app.use(notFoundHandler);

app.use(errorHandler);

export { app };
