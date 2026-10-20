import { Hono } from 'hono';
import { wrap } from '../../http/express-adapter';
import { getSiteContentController } from './restaurant.controller';

export const restaurantRouter = new Hono();

// Public, no auth: About and Contact render for anonymous visitors.
restaurantRouter.get('/restaurant', wrap(getSiteContentController));
