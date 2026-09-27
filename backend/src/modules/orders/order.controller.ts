import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import {
  createOrder,
  getInvoice,
  getOrderStatus,
  quoteOrder,
} from './order.service';
import {
  createOrderSchema,
  publicTokenParamSchema,
  quoteSchema,
} from './order.validation';

export async function quoteController(req: Request, res: Response): Promise<void> {
  const body = quoteSchema.parse(req.body);
  sendSuccess(res, await quoteOrder(body));
}

export async function createOrderController(req: Request, res: Response): Promise<void> {
  const body = createOrderSchema.parse(req.body);
  const { data, created } = await createOrder(body);
  sendSuccess(res, data, created ? 201 : 200);
}

export async function getOrderController(req: Request, res: Response): Promise<void> {
  const { publicToken } = publicTokenParamSchema.parse(req.params);
  sendSuccess(res, await getOrderStatus(publicToken));
}

export async function getInvoiceController(req: Request, res: Response): Promise<void> {
  const { publicToken } = publicTokenParamSchema.parse(req.params);
  sendSuccess(res, await getInvoice(publicToken));
}
