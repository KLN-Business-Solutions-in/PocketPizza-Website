import { Router } from 'express';
import { ah } from '../../utils/async-handler';
import { quoteController } from './order.controller';

export const orderRouter = Router();

orderRouter.post('/orders/quote', ah(quoteController));
