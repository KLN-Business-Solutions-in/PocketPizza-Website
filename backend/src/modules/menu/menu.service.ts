import type {
  AdminMenuItem,
  AdminMenuResponse,
  Category,
  CreateProductRequest,
  MenuItem,
  MenuResponse,
  ProductDetailResponse,
  ToggleStatusResponse,
  UpdateProductRequest,
} from '@pokket-pizza/contract/contract';
import { getPrisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { toFixed2 } from '../../utils/decimal';
import type { AdminItemRow, CategoryRow, ItemRow, Money } from './menu.types';
import {
  createMenuItem,
  findAdminCategories,
  findCategoryById,
  findMenuItemById,
  toggleMenuItemActive,
  updateMenuItemInTransaction,
} from './menu.repository';

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

function serializeAdminMenuItem(item: AdminItemRow): AdminMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    basePrice: money(item.basePrice),
    imageUrl: item.imageUrl,
    isVeg: item.isVeg,
    isActive: item.isActive,
    categoryId: item.categoryId,
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

export async function getAdminMenu(
  restaurantId: string,
): Promise<AdminMenuResponse> {
  const categories = await findAdminCategories(restaurantId);
  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      items: category.items.map((item) =>
        serializeAdminMenuItem(item as AdminItemRow),
      ),
    })),
  };
}

export async function createProduct(
  input: CreateProductRequest,
  restaurantId: string,
): Promise<AdminMenuItem> {
  const category = await findCategoryById(input.categoryId, restaurantId);
  if (!category) throw new NotFoundError('Category');

  const created = await createMenuItem(input, restaurantId);
  return serializeAdminMenuItem(created);
}

export async function updateProduct(
  id: string,
  input: UpdateProductRequest,
  restaurantId: string,
): Promise<AdminMenuItem> {
  if (Object.keys(input).length === 0) {
    throw new ValidationError('Update body must include at least one field');
  }

  const existing = await findMenuItemById(id, restaurantId);
  if (!existing) throw new NotFoundError('Product');

  if (input.categoryId !== undefined) {
    const category = await findCategoryById(input.categoryId, restaurantId);
    if (!category) throw new NotFoundError('Category');
  }

  const updated = await updateMenuItemInTransaction(id, restaurantId, input);
  return serializeAdminMenuItem(updated);
}

export async function toggleProductStatus(
  id: string,
  restaurantId: string,
): Promise<ToggleStatusResponse> {
  const current = await findMenuItemById(id, restaurantId);
  if (!current) throw new NotFoundError('Product');

  return toggleMenuItemActive(current.id, !current.isActive);
}
