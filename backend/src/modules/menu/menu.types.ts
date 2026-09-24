export type Money = { toString(): string };

export type VariantRow = { id: string; label: string; priceDelta: Money };
export type AddOnRow = { id: string; label: string; price: Money };

export type ItemRow = {
  id: string;
  name: string;
  description: string | null;
  basePrice: Money;
  imageUrl: string | null;
  isVeg: boolean;
  variants: VariantRow[];
  addOns: AddOnRow[];
};

export type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  items: ItemRow[];
};

export type AdminItemRow = ItemRow & {
  isActive: boolean;
  categoryId: string;
};
