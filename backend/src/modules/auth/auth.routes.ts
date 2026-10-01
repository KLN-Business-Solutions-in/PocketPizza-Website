import { Router } from 'express';
import { ah } from '../../utils/async-handler';
import {
  loginRateLimit,
  refreshRateLimit,
} from '../../middleware/rateLimit.middleware';
import {
  loginController,
  logoutController,
  refreshController,
} from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginRateLimit, ah(loginController));
authRouter.post('/refresh', refreshRateLimit, ah(refreshController));
authRouter.post('/logout', ah(logoutController));
