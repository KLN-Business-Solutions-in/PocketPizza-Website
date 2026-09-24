import { Router } from 'express';
import { sendSuccess } from '../../utils/response';
import { menuAdminRouter } from '../menu/menu.routes';

export const adminRouter = Router();

adminRouter.get('/ping', (req, res) => {
  sendSuccess(res, {
    ok: true,
    adminId: req.admin?.id ?? null,
  });
});

adminRouter.use(menuAdminRouter);
