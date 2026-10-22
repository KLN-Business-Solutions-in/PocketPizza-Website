import { Hono, type MiddlewareHandler } from 'hono';
import { wrap } from '../../http/express-adapter';
import {
  orderCreateRateLimit,
  phoneOrdersIpRateLimit,
  phoneOrdersPhoneRateLimit,
  tokenLookupRateLimit,
} from '../../middleware/rateLimit.middleware';
import {
  createOrderController,
  getAdminOrderController,
  getInvoiceController,
  getOrderController,
  getOrdersByPhoneController,
  listAdminOrdersController,
  quoteController,
  updateAdminOrderStatusController,
} from './order.controller';

// PII-bearing order responses must never be cached
const noStore: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
};

export const orderRouter = new Hono();

orderRouter.use('*', noStore);
orderRouter.post('/orders/quote', wrap(quoteController));
orderRouter.post('/orders', orderCreateRateLimit, wrap(createOrderController));
// Registered before /orders/:publicToken so "phone" is never parsed as a token.
orderRouter.get(
  '/orders/phone/:phone',
  phoneOrdersIpRateLimit,
  phoneOrdersPhoneRateLimit,
  wrap(getOrdersByPhoneController),
);
orderRouter.get('/orders/:publicToken', tokenLookupRateLimit, wrap(getOrderController));
orderRouter.get(
  '/orders/:publicToken/invoice',
  tokenLookupRateLimit,
  wrap(getInvoiceController),
);

export const orderAdminRouter = new Hono();

orderAdminRouter.use('*', noStore);
orderAdminRouter.get('/orders', wrap(listAdminOrdersController));
orderAdminRouter.get('/orders/:id', wrap(getAdminOrderController));
orderAdminRouter.patch('/orders/:id/status', wrap(updateAdminOrderStatusController));
