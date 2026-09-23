import { Request, Response } from 'express';
import { getMenu, getProduct } from './menu.service';
import { cuidParamSchema } from './menu.validation';
import { sendSuccess } from '../../utils/response';

export async function listMenu(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getMenu());
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  const { id } = cuidParamSchema.parse({ id: req.params.id });
  sendSuccess(res, await getProduct(id));
}
