import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ah } from '../../utils/async-handler';
import {
  orderCreateRateLimit,
  tokenLookupRateLimit,
} from '../../middleware/rateLimit.middleware';
import {
  createOrderController,
  getAdminOrderController,
  getInvoiceController,
  getOrderController,
  listAdminOrdersController,
  quoteController,
  updateAdminOrderStatusController,
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

export const orderAdminRouter = Router();

// PII-bearing admin order responses must never be cached (mirrors public router above)
orderAdminRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

orderAdminRouter.get('/orders', ah(listAdminOrdersController));
orderAdminRouter.get('/orders/:id', ah(getAdminOrderController));
orderAdminRouter.patch('/orders/:id/status', ah(updateAdminOrderStatusController));
