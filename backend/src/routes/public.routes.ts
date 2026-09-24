import { Router } from 'express';
import { SEED_CATEGORIES } from '../data/menu';
import { NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

/**
 * Local seeded public API. Replace the repository lookup with Prisma when the
 * development database is available; the response shape is already frozen.
 */
export const publicRouter = Router();

publicRouter.get('/menu', (_req, res) => {
  sendSuccess(res, { categories: SEED_CATEGORIES });
});

publicRouter.get('/products/:id', (req, res, next) => {
  const product = SEED_CATEGORIES.flatMap((category) => category.items).find(
    (item) => item.id === req.params.id
  );

  if (!product) {
    next(new NotFoundError('Product'));
    return;
  }

  sendSuccess(res, product);
});
