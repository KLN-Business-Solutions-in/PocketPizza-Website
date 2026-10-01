import type {
  ReportSummaryQuery,
  ReportSummaryResponse,
} from '@pokket-pizza/contract/contract';
import { getPrisma } from '../../config/database';
import { toFixed2 } from '../../utils/decimal';
import { istDayWindowUtc } from '../orders/order.repository';

// Sales metrics count COMPLETED orders only (cancelled/never-fulfilled orders
// are not revenue); counts cover every status. Day boundaries are IST to match
// order-number day windows.
export async function getReportSummary(
  query: ReportSummaryQuery,
  restaurantId: string,
): Promise<ReportSummaryResponse> {
  const prisma = await getPrisma();
  const createdAt = {
    gte: istDayWindowUtc(query.from).gte,
    lt: istDayWindowUtc(query.to).lt,
  };
  const base = { restaurantId, createdAt };

  const [total, completed, cancelled, sales, top] = await Promise.all([
    prisma.order.count({ where: base }),
    prisma.order.count({ where: { ...base, status: 'COMPLETED' } }),
    prisma.order.count({ where: { ...base, status: 'CANCELLED' } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...base, status: 'COMPLETED' },
    }),
    prisma.orderItem.groupBy({
      by: ['nameSnapshot'],
      _sum: { quantity: true, lineTotal: true },
      where: { order: { ...base, status: 'COMPLETED' } },
      orderBy: [{ _sum: { quantity: 'desc' } }, { _sum: { lineTotal: 'desc' } }],
      take: 5,
    }),
  ]);

  const salesTotal = toFixed2(String(sales._sum.total ?? 0));
  const averageOrderValue =
    completed > 0 ? toFixed2(String(Number(salesTotal) / completed)) : toFixed2('0');

  return {
    orderCount: { total, completed, cancelled },
    salesTotal,
    averageOrderValue,
    topItems: top.map((t) => ({
      name: t.nameSnapshot,
      quantity: t._sum.quantity ?? 0,
      totalRevenue: toFixed2(String(t._sum.lineTotal ?? 0)),
    })),
  };
}
