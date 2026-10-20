import { Hono } from 'hono';
import { wrap, wrapMiddleware } from '../../http/express-adapter';
import { requireCustomer } from '../../middleware/auth.middleware';
import {
  customerLoginIpRateLimit,
  customerLoginPhoneRateLimit,
  customerLoginRateLimit,
  customerSignupRateLimit,
  refreshRateLimit,
} from '../../middleware/rateLimit.middleware';
import {
  customerLoginController,
  customerLogoutController,
  customerMeController,
  customerRefreshController,
  customerSignupController,
} from './auth.customer.controller';

export const customerAuthRouter = new Hono();

customerAuthRouter.post('/signup', customerSignupRateLimit, wrap(customerSignupController));
customerAuthRouter.post(
  '/login',
  customerLoginIpRateLimit,
  customerLoginPhoneRateLimit,
  customerLoginRateLimit,
  wrap(customerLoginController),
);
customerAuthRouter.post('/refresh', refreshRateLimit, wrap(customerRefreshController));
customerAuthRouter.post('/logout', wrap(customerLogoutController));
customerAuthRouter.get('/me', wrapMiddleware(requireCustomer), wrap(customerMeController));
