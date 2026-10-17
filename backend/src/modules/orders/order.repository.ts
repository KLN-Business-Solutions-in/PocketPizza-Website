import type { OrderStatus, OrderType } from '@pokket-pizza/contract/contract';
import { getPrisma } from '../../config/database';
import { AppError, BusinessRuleError } from '../../utils/errors';
import { isTransitionAllowed } from './order.validation';
import type { OrderPhoneCursor } from './order.types';
import type { Prisma } from '../../generated/prisma/client';

export async function findQuoteItems(ids: string[], restaurantId: string) {
  const prisma = await getPrisma();
  return prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId, category: { isActive: true } },
    include: {
      variants: true,
      addOns: { where: { isActive: true } },
    },
  });
}

export async function findRestaurantPricing() {
  const prisma = await getPrisma();
  return prisma.restaurant.findFirst({ select: { id: true, deliveryFee: true } });
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDay(now = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istDayWindowUtc(day: string): { gte: Date; lt: Date } {
  const startUtc = new Date(Date.parse(`${day}T00:00:00.000Z`) - IST_OFFSET_MS);
  return { gte: startUtc, lt: new Date(startUtc.getTime() + 24 * 60 * 60 * 1000) };
}

export type PlaceOrderInput = {
  publicToken: string;
  idempotencyKey: string | null;
  restaurantId: string;
  customer: { name: string; phone: string };
  orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  deliveryAddress: string | null;
  notes: string | null;
  subtotal: string;
  deliveryFee: string;
  deliveryDistanceKm: number | null;
  tax: string;
  total: string;
  items: {
    menuItemId: string;
    nameSnapshot: string;
    variantSnapshot: string | null;
    addOnSnapshot: { label: string; price: string }[];
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
};

export async function placeOrder(input: PlaceOrderInput) {
  const prisma = await getPrisma();
  return prisma.$transaction(
    async (tx) => {
      // count+1 is only race-free under a lock: advisory xact lock serializes
      // allocation for the day and auto-releases on commit/rollback.
      // The void-returning lock call must be projected away — Prisma cannot
      // deserialize a void column, hence the `SELECT 1 FROM (...)`.
      const day = istDay();
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`order-number:${day}`}))) AS lock_taken`;
      const count = await tx.order.count({ where: { createdAt: istDayWindowUtc(day) } });
      const orderNumber = `ORD-${day.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;

      const customer = await tx.customer.upsert({
        where: { phone: input.customer.phone },
        // first writer wins: unauthenticated orders must not overwrite stored names
        update: {},
        create: {
          restaurantId: input.restaurantId,
          name: input.customer.name,
          phone: input.customer.phone,
        },
      });
      const order = await tx.order.create({
        data: {
          orderNumber,
          publicToken: input.publicToken,
          idempotencyKey: input.idempotencyKey,
          restaurantId: input.restaurantId,
          customerId: customer.id,
          orderType: input.orderType,
          deliveryAddress: input.deliveryAddress,
          notes: input.notes,
          subtotal: input.subtotal,
          deliveryFee: input.deliveryFee,
          deliveryDistanceKm: input.deliveryDistanceKm,
          tax: input.tax,
          total: input.total,
          items: {
            create: input.items.map((i) => ({
              menuItemId: i.menuItemId,
              nameSnapshot: i.nameSnapshot,
              variantSnapshot: i.variantSnapshot,
              addOnsSnapshot: i.addOnSnapshot,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
          },
        },
        include: { items: true },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, oldStatus: 'NEW', newStatus: 'NEW', changedBy: 'system' },
      });
      return order;
    },
    // remote DB (~400ms per statement) + advisory-lock serialization under
    // concurrent bursts outlasts Prisma's 5s default → P2028
    { maxWait: 10_000, timeout: 30_000 },
  );
}

export async function findOrderByIdempotencyKey(key: string) {
  const prisma = await getPrisma();
  return prisma.order.findUnique({
    where: { idempotencyKey: key },
    include: {
      items: {
        select: { menuItemId: true, quantity: true, variantSnapshot: true, addOnsSnapshot: true },
      },
      customer: { select: { phone: true } },
    },
  });
}

const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function expireOldIdempotencyKeys(): Promise<void> {
  const prisma = await getPrisma();
  await prisma.order.updateMany({
    where: {
      idempotencyKey: { not: null },
      createdAt: { lt: new Date(Date.now() - IDEMPOTENCY_TTL_MS) },
    },
    data: { idempotencyKey: null },
  });
}

export async function findOrderByToken(publicToken: string) {
  const prisma = await getPrisma();
  return prisma.order.findUnique({
    where: { publicToken },
    include: {
      items: true,
      customer: true,
      notifications: {
        where: { channel: 'whatsapp' },
        orderBy: { createdAt: 'desc' },
        select: { template: true, status: true, destination: true, createdAt: true },
      },
    },
  });
}

const CURRENT_ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
];
const PAST_ORDER_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

// Summary-only projection for the customer phone lookup (issue #43): totals
// and status, never name/phone/address — the caller already knows the phone.
const phoneOrderSelect = {
  id: true,
  orderNumber: true,
  publicToken: true,
  status: true,
  orderType: true,
  total: true,
  createdAt: true,
  items: { select: { quantity: true } },
} as const;

type PhoneOrderRow = Prisma.OrderGetPayload<{ select: typeof phoneOrderSelect }>;

/**
 * Current orders first, terminal ones after, newest first inside each group
 * (issue #43). Two grouped queries instead of one: Prisma cannot order by a
 * computed "is terminal" flag, and re-sorting after a LIMIT would push old
 * but still-active orders off the page.
 *
 * `limit + 1` rows are read to detect a next page without a COUNT; the cursor
 * position is (group, createdAt, id) so a page boundary stays stable even when
 * two orders share a createdAt millisecond.
 */
export async function findOrdersByPhone(
  phone: string,
  limit: number,
  cursor: OrderPhoneCursor | null,
): Promise<{ rows: PhoneOrderRow[]; nextCursor: OrderPhoneCursor | null }> {
  const prisma = await getPrisma();
  const take = limit + 1;
  const orderBy: Prisma.OrderOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
    { id: 'desc' },
  ];

  const strictlyAfter = (pos: OrderPhoneCursor) => ({
    OR: [
      { createdAt: { lt: pos.createdAt } },
      { createdAt: pos.createdAt, id: { lt: pos.id } },
    ],
  });

  const rows: PhoneOrderRow[] = [];

  // group 0 = current: resume mid-group when a cursor says so; group 1 means
  // the previous page already exhausted the current group, so skip straight
  // to terminal orders.
  if (!cursor || cursor.group === 0) {
    const current = await prisma.order.findMany({
      where: {
        customer: { phone },
        status: { in: CURRENT_ORDER_STATUSES },
        ...(cursor ? strictlyAfter(cursor) : {}),
      },
      select: phoneOrderSelect,
      orderBy,
      take,
    });
    rows.push(...current);
  }

  if (rows.length < take) {
    const past = await prisma.order.findMany({
      where: {
        customer: { phone },
        status: { in: PAST_ORDER_STATUSES },
        ...(cursor && cursor.group === 1 ? strictlyAfter(cursor) : {}),
      },
      select: phoneOrderSelect,
      orderBy,
      take: take - rows.length,
    });
    rows.push(...past);
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor: OrderPhoneCursor | null =
    hasMore && last
      ? {
          group: PAST_ORDER_STATUSES.includes(last.status) ? 1 : 0,
          createdAt: last.createdAt,
          id: last.id,
        }
      : null;

  return { rows: page, nextCursor };
}

const adminOrderSummarySelect = {
  id: true,
  orderNumber: true,
  orderType: true,
  status: true,
  total: true,
  createdAt: true,
  customer: { select: { name: true, phone: true } },
  items: true,
} as const;

export async function findAdminOrders(
  restaurantId: string,
  query: {
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  },
) {
  const prisma = await getPrisma();
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (query.dateFrom) createdAt.gte = istDayWindowUtc(query.dateFrom).gte;
  if (query.dateTo) createdAt.lt = istDayWindowUtc(query.dateTo).lt;

  return prisma.order.findMany({
    where: {
      restaurantId,
      ...(query.status && { status: query.status as OrderStatus }),
      ...(query.type && { orderType: query.type as OrderType }),
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
    },
    select: adminOrderSummarySelect,
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
}

export async function findAdminOrderDetail(id: string, restaurantId: string) {
  const prisma = await getPrisma();
  return prisma.order.findFirst({
    where: { id, restaurantId },
    include: {
      customer: true,
      items: true,
      statusHistory: { orderBy: { changedAt: 'asc' } },
    },
  });
}

export async function updateOrderStatusTx(input: {
  orderId: string;
  restaurantId: string;
  nextStatus: OrderStatus;
  changedBy: string;
}): Promise<void> {
  const prisma = await getPrisma();
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, restaurantId: input.restaurantId },
      select: { id: true, status: true, orderType: true },
    });
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    if (!isTransitionAllowed(order.status, input.nextStatus, order.orderType)) {
      throw new BusinessRuleError(
        'ORDER_INVALID_TRANSITION',
        `Transition from ${order.status} to ${input.nextStatus} is not permitted.`,
      );
    }
    // optimistic guard: conditional on the status we validated, so a
    // concurrent writer that changed it first makes this a no-op (0 rows)
    const res = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: input.nextStatus },
    });
    if (res.count === 0) {
      throw new BusinessRuleError(
        'ORDER_INVALID_TRANSITION',
        'Order status changed concurrently; reload and retry.',
      );
    }
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: input.nextStatus,
        changedBy: input.changedBy,
      },
    });
  });
}
