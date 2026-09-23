import { Router } from 'express';
import { sendSuccess } from '../../utils/response';

export const adminRouter = Router();

adminRouter.get('/ping', (req, res) => {
  sendSuccess(res, {
    ok: true,
    adminId: req.admin?.id ?? null,
  });
});
