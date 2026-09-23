import type {
  Category,
  MenuItem,
  MenuResponse,
  ProductDetailResponse,
} from '@pokket-pizza/contract/contract';
import { getPrisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { toFixed2 } from '../../utils/decimal';
import type { CategoryRow, ItemRow, Money } from './menu.types';

const money = (value: Money): string => toFixed2(value.toString());

function serializeMenuItem(item: ItemRow): MenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    basePrice: money(item.basePrice),
    imageUrl: item.imageUrl,
    isVeg: item.isVeg,
    variants: item.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      priceDelta: money(variant.priceDelta),
    })),
    addOns: item.addOns.map((addOn) => ({
      id: addOn.id,
      label: addOn.label,
      price: money(addOn.price),
    })),
  };
}

function serializeCategory(category: CategoryRow): Category {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    items: category.items.map(serializeMenuItem),
  };
}

export async function getMenu(): Promise<MenuResponse> {
  const prisma = await getPrisma();

  const restaurant = await prisma.restaurant.findFirst({
    select: { id: true },
  });

  if (!restaurant) {
    return { categories: [] };
  }

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          variants: { orderBy: { priceDelta: 'asc' } },
          addOns: { where: { isActive: true }, orderBy: { id: 'asc' } },
        },
      },
    },
  });

  return { categories: categories.map(serializeCategory) };
}

export async function getProduct(id: string): Promise<ProductDetailResponse> {
  const prisma = await getPrisma();

  const restaurant = await prisma.restaurant.findFirst({
    select: { id: true },
  });

  const item = restaurant
    ? await prisma.menuItem.findFirst({
        where: { id, restaurantId: restaurant.id, isActive: true },
        include: {
          variants: { orderBy: { priceDelta: 'asc' } },
          addOns: { where: { isActive: true }, orderBy: { id: 'asc' } },
        },
      })
    : null;

  if (!item) throw new NotFoundError('Product');

  return serializeMenuItem(item);
}
