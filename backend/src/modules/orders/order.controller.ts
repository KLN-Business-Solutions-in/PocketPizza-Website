import type { Request, Response } from 'express';
import { adminOrderListQuerySchema, updateStatusRequestSchema } from '@pokket-pizza/contract/contract';
import { sendSuccess } from '../../utils/response';
import {
  createOrder,
  getAdminOrderDetail,
  getInvoice,
  getOrderStatus,
  listAdminOrders,
  quoteOrder,
  updateAdminOrderStatus,
} from './order.service';
import {
  adminOrderIdParamSchema,
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

export async function listAdminOrdersController(req: Request, res: Response): Promise<void> {
  const query = adminOrderListQuerySchema.parse(req.query);
  sendSuccess(res, await listAdminOrders(query, req.admin!.restaurantId));
}

export async function getAdminOrderController(req: Request, res: Response): Promise<void> {
  const { id } = adminOrderIdParamSchema.parse(req.params);
  sendSuccess(res, await getAdminOrderDetail(id, req.admin!.restaurantId));
}

export async function updateAdminOrderStatusController(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = adminOrderIdParamSchema.parse(req.params);
  const body = updateStatusRequestSchema.parse(req.body);
  sendSuccess(
    res,
    await updateAdminOrderStatus(id, body, req.admin!.restaurantId, req.admin!.id),
  );
}
