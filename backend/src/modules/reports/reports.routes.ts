import { Hono, type MiddlewareHandler } from 'hono';
import type { Request, Response } from 'express';
import { reportSummaryQuerySchema } from '@pokket-pizza/contract/contract';
import { wrap } from '../../http/express-adapter';
import { sendSuccess } from '../../utils/response';
import { getReportSummary } from './reports.service';

export const reportAdminRouter = new Hono();

const noStore: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
};

reportAdminRouter.use('*', noStore);

async function getReportSummaryController(req: Request, res: Response): Promise<void> {
  const query = reportSummaryQuerySchema.parse(req.query);
  sendSuccess(res, await getReportSummary(query, req.admin!.restaurantId));
}

reportAdminRouter.get('/reports/summary', wrap(getReportSummaryController));
