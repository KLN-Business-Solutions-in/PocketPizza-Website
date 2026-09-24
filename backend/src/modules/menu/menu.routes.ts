import { Router } from 'express';
import { ah } from '../../utils/async-handler';
import {
  listMenu,
  getProductById,
  listAdminMenu,
  createProductController,
  updateProductController,
  toggleProductStatusController,
} from './menu.controller';

export const menuRouter = Router();
export const menuAdminRouter = Router();

menuRouter.get('/menu', ah(listMenu));
menuRouter.get('/products/:id', ah(getProductById));

menuAdminRouter.get('/menu', ah(listAdminMenu));
menuAdminRouter.post('/products', ah(createProductController));
menuAdminRouter.patch('/products/:id', ah(updateProductController));
menuAdminRouter.patch('/products/:id/status', ah(toggleProductStatusController));
