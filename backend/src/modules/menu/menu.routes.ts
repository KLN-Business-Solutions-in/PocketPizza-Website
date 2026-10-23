import { Hono } from 'hono';
import { wrap } from '../../http/express-adapter';
import {
  listMenu,
  getProductById,
  listAdminMenu,
  createProductController,
  updateProductController,
  toggleProductStatusController,
} from './menu.controller';

export const menuRouter = new Hono();
export const menuAdminRouter = new Hono();

menuRouter.get('/menu', wrap(listMenu));
menuRouter.get('/products/:id', wrap(getProductById));

menuAdminRouter.get('/menu', wrap(listAdminMenu));
menuAdminRouter.post('/products', wrap(createProductController));
menuAdminRouter.patch('/products/:id', wrap(updateProductController));
menuAdminRouter.patch('/products/:id/status', wrap(toggleProductStatusController));
