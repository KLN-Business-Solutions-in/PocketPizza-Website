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

app.use(notFoundHandler);

app.use(errorHandler);

export { app };
