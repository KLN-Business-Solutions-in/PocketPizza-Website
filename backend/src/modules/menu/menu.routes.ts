import { Router } from 'express';
import { ah } from '../../utils/async-handler';
import { listMenu, getProductById } from './menu.controller';

export const menuRouter = Router();

menuRouter.get('/menu', ah(listMenu));
menuRouter.get('/products/:id', ah(getProductById));
