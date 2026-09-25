import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { quoteOrder } from './order.service';
import { quoteSchema } from './order.validation';

export async function quoteController(req: Request, res: Response): Promise<void> {
  const body = quoteSchema.parse(req.body);
  sendSuccess(res, await quoteOrder(body));
}
