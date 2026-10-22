import { Hono } from 'hono';
import { wrap } from '../../http/express-adapter';
import {
  loginRateLimit,
  refreshRateLimit,
} from '../../middleware/rateLimit.middleware';
import {
  loginController,
  logoutController,
  refreshController,
} from './auth.controller';
import { customerAuthRouter } from './auth.customer.routes';

export const authRouter = new Hono();

authRouter.post('/login', loginRateLimit, wrap(loginController));
authRouter.post('/refresh', refreshRateLimit, wrap(refreshController));
authRouter.post('/logout', wrap(logoutController));
authRouter.route('/customer', customerAuthRouter);
