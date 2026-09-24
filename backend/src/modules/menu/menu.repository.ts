import type { CreateProductRequest, UpdateProductRequest } from '@pokket-pizza/contract/contract';
import { getPrisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import type { AdminItemRow } from './menu.types';

const itemInclude = {
  variants: { orderBy: { priceDelta: 'asc' as const } },
  addOns: { orderBy: { id: 'asc' as const } },
} as const;

export async function findRestaurantId(): Promise<string | null> {
  const prisma = await getPrisma();
  const restaurant = await prisma.restaurant.findFirst({ select: { id: true } });
  return restaurant?.id ?? null;
}

export async function findAdminCategories(restaurantId: string) {
  const prisma = await getPrisma();
  return prisma.category.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: itemInclude,
      },
    },
  });
}

export async function findCategoryById(
  categoryId: string,
  restaurantId: string,
): Promise<{ id: string } | null> {
  const prisma = await getPrisma();
  return prisma.category.findFirst({
    where: { id: categoryId, restaurantId },
    select: { id: true },
  });
}

export async function findMenuItemById(
  id: string,
  restaurantId: string,
): Promise<AdminItemRow | null> {
  const prisma = await getPrisma();
  const item = await prisma.menuItem.findFirst({
    where: { id, restaurantId },
    include: itemInclude,
  });
  return item as AdminItemRow | null;
}

export async function createMenuItem(
  input: CreateProductRequest,
  restaurantId: string,
): Promise<AdminItemRow> {
  const prisma = await getPrisma();
  const created = await prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      basePrice: input.basePrice,
      imageUrl: input.imageUrl ?? null,
      isVeg: input.isVeg,
      ...(input.variants
        ? {
            variants: {
              create: input.variants.map((v) => ({
                label: v.label,
                priceDelta: v.priceDelta,
              })),
            },
          }
        : {}),
      ...(input.addOns
        ? {
            addOns: {
              create: input.addOns.map((a) => ({
                label: a.label,
                price: a.price,
              })),
            },
          }
        : {}),
    },
    include: itemInclude,
  });
  return created as AdminItemRow;
}

export async function updateMenuItemInTransaction(
  id: string,
  restaurantId: string,
  input: UpdateProductRequest,
): Promise<AdminItemRow> {
  const prisma = await getPrisma();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.menuItem.findFirst({
      where: { id, restaurantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Product');

    if (input.categoryId !== undefined) {
      const category = await tx.category.findFirst({
        where: { id: input.categoryId, restaurantId },
        select: { id: true },
      });
      if (!category) throw new NotFoundError('Category');
    }

    const scalarData: Record<string, unknown> = {};
    if (input.name !== undefined) scalarData.name = input.name;
    if (input.description !== undefined) scalarData.description = input.description;
    if (input.categoryId !== undefined) scalarData.categoryId = input.categoryId;
    if (input.basePrice !== undefined) scalarData.basePrice = input.basePrice;
    if (input.imageUrl !== undefined) scalarData.imageUrl = input.imageUrl;
    if (input.isVeg !== undefined) scalarData.isVeg = input.isVeg;

    if (Object.keys(scalarData).length > 0) {
      await tx.menuItem.update({ where: { id }, data: scalarData });
    }

    if (input.variants !== undefined) {
      await tx.itemVariant.deleteMany({ where: { menuItemId: id } });
      if (input.variants.length > 0) {
        await tx.itemVariant.createMany({
          data: input.variants.map((v) => ({
            menuItemId: id,
            label: v.label,
            priceDelta: v.priceDelta,
          })),
        });
      }
    }

    if (input.addOns !== undefined) {
      await tx.itemAddOn.deleteMany({ where: { menuItemId: id } });
      if (input.addOns.length > 0) {
        await tx.itemAddOn.createMany({
          data: input.addOns.map((a) => ({
            menuItemId: id,
            label: a.label,
            price: a.price,
          })),
        });
      }
    }

    const refreshed = await tx.menuItem.findFirst({
      where: { id },
      include: itemInclude,
    });
    if (!refreshed) throw new NotFoundError('Product');
    return refreshed as AdminItemRow;
  });
}

export async function toggleMenuItemActive(
  id: string,
  isActive: boolean,
): Promise<{ id: string; isActive: boolean }> {
  const prisma = await getPrisma();
  try {
    return await prisma.menuItem.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      throw new NotFoundError('Product');
    }
    throw error;
  }
}
