import { Hono } from 'hono';
import { wrap } from '../../http/express-adapter';
import { sendSuccess } from '../../utils/response';
import { menuAdminRouter } from '../menu/menu.routes';
import { orderAdminRouter } from '../orders/order.routes';
import { reportAdminRouter } from '../reports/reports.routes';

export const adminRouter = new Hono();

adminRouter.get(
  '/ping',
  wrap((req, res) => {
    sendSuccess(res, {
      ok: true,
      adminId: req.admin?.id ?? null,
    });
  }),
);

adminRouter.route('/', menuAdminRouter);
adminRouter.route('/', orderAdminRouter);
adminRouter.route('/', reportAdminRouter);
