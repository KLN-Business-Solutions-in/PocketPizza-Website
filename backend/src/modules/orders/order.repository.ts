import { getPrisma } from '../../config/database';

export async function findQuoteItems(ids: string[]) {
  const prisma = await getPrisma();
  return prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: {
      variants: true,
      addOns: { where: { isActive: true } },
    },
  });
}

export async function findRestaurantPricing() {
  const prisma = await getPrisma();
  return prisma.restaurant.findFirst({ select: { deliveryFee: true } });
}
