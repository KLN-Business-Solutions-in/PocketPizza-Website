import { Router } from 'express';
import { ah } from '../../utils/async-handler';
import { loginRateLimit } from '../../middleware/rateLimit.middleware';
import { loginController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginRateLimit, ah(loginController));
