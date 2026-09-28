import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ah } from '../../utils/async-handler';
import {
  orderCreateRateLimit,
  tokenLookupRateLimit,
} from '../../middleware/rateLimit.middleware';
import {
  createOrderController,
  getInvoiceController,
  getOrderController,
  quoteController,
} from './order.controller';

export const orderRouter = Router();

// PII-bearing order responses must never be cached
orderRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

orderRouter.post('/orders/quote', ah(quoteController));
orderRouter.post('/orders', orderCreateRateLimit, ah(createOrderController));
orderRouter.get('/orders/:publicToken', tokenLookupRateLimit, ah(getOrderController));
orderRouter.get('/orders/:publicToken/invoice', tokenLookupRateLimit, ah(getInvoiceController));
