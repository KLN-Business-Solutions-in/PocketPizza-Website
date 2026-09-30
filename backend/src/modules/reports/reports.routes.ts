import { Router } from 'express';
import type { Request, Response } from 'express';
import { reportSummaryQuerySchema } from '@pokket-pizza/contract/contract';
import { ah } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import { getReportSummary } from './reports.service';

export const reportAdminRouter = Router();

reportAdminRouter.use((_req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

async function getReportSummaryController(req: Request, res: Response): Promise<void> {
  const query = reportSummaryQuerySchema.parse(req.query);
  sendSuccess(res, await getReportSummary(query, req.admin!.restaurantId));
}

reportAdminRouter.get('/reports/summary', ah(getReportSummaryController));
