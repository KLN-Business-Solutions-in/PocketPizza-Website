import { Request, Response } from 'express';
import {
  getMenu,
  getProduct,
  getAdminMenu,
  createProduct,
  updateProduct,
  toggleProductStatus,
} from './menu.service';
import {
  cuidParamSchema,
  createProductSchema,
  updateProductSchema,
} from './menu.validation';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';

export async function listMenu(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getMenu());
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  const { id } = cuidParamSchema.parse({ id: req.params.id });
  sendSuccess(res, await getProduct(id));
}

export async function listAdminMenu(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getAdminMenu());
}

export async function createProductController(
  req: Request,
  res: Response,
): Promise<void> {
  const body = createProductSchema.parse(req.body);
  sendSuccess(res, await createProduct(body), 201);
}

export async function updateProductController(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = cuidParamSchema.parse({ id: req.params.id });
  if (
    req.body === null ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body) ||
    Object.keys(req.body as object).length === 0
  ) {
    throw new ValidationError('Update body must include at least one field');
  }
  const raw = req.body as Record<string, unknown>;
  const parsed = updateProductSchema.parse(req.body);
  const body = Object.fromEntries(
    Object.keys(raw)
      .filter((k) => k in parsed)
      .map((k) => [k, (parsed as Record<string, unknown>)[k]]),
  ) as typeof parsed;
  sendSuccess(res, await updateProduct(id, body));
}

export async function toggleProductStatusController(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = cuidParamSchema.parse({ id: req.params.id });
  sendSuccess(res, await toggleProductStatus(id));
}
