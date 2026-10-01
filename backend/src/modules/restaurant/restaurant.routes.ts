import { Router } from 'express';
import { ah } from '../../utils/async-handler';
import { getSiteContentController } from './restaurant.controller';

export const restaurantRouter = Router();

// Public, no auth: About and Contact render for anonymous visitors.
restaurantRouter.get('/restaurant', ah(getSiteContentController));