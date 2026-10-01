import { Router } from 'express';
import { sendSuccess } from '../../utils/response';
import { menuAdminRouter } from '../menu/menu.routes';
import { orderAdminRouter } from '../orders/order.routes';
import { reportAdminRouter } from '../reports/reports.routes';

export const adminRouter = Router();

adminRouter.get('/ping', (req, res) => {
  sendSuccess(res, {
    ok: true,
    adminId: req.admin?.id ?? null,
  });
});

adminRouter.use(menuAdminRouter);
adminRouter.use(orderAdminRouter);
adminRouter.use(reportAdminRouter);
