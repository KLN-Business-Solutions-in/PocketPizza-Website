import { getPrisma } from '../../config/database';

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

function istDayWindowUtc(day: string): { gte: Date; lt: Date } {
  const startUtc = new Date(Date.parse(`${day}T00:00:00.000Z`) - IST_OFFSET_MS);
  return { gte: startUtc, lt: new Date(startUtc.getTime() + 24 * 60 * 60 * 1000) };
}

export async function nextOrderNumber(): Promise<string> {
  const prisma = await getPrisma();
  const day = istDay();
  const count = await prisma.order.count({ where: { createdAt: istDayWindowUtc(day) } });
  return `ORD-${day.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
}

export type PlaceOrderInput = {
  orderNumber: string;
  publicToken: string;
  idempotencyKey: string | null;
  restaurantId: string;
  customer: { name: string; phone: string };
  orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  deliveryAddress: string | null;
  notes: string | null;
  subtotal: string;
  deliveryFee: string;
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
  return prisma.$transaction(async (tx) => {
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
        orderNumber: input.orderNumber,
        publicToken: input.publicToken,
        idempotencyKey: input.idempotencyKey,
        restaurantId: input.restaurantId,
        customerId: customer.id,
        orderType: input.orderType,
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
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
  });
}

export async function findOrderByIdempotencyKey(key: string) {
  const prisma = await getPrisma();
  return prisma.order.findUnique({
    where: { idempotencyKey: key },
    include: {
      items: { select: { menuItemId: true, quantity: true } },
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
    include: { items: true, customer: true },
  });
}
