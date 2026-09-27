"use client";

import React, { useMemo, useState } from "react";
import { useMenuFlat } from "@/lib/api/useMenu";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { ProductModal } from "@/components/menu/ProductModal";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/LayoutPrimitives";
import type { MenuItem } from "@shared/contract/contract";

export function MenuContent() {
  const { categories, products, isLoading, isPending, isError, error, refetch } = useMenuFlat();
  const isMenuLoading = isLoading || isPending;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === "all") return products;
    return selectedCategory?.items ?? [];
  }, [products, selectedCategory, selectedCategoryId]);

  const emptyTitle = useMemo(() => {
    if (selectedCategoryId === "all") return "No menu items available";
    if (selectedCategory) return `No items in ${selectedCategory.name} yet`;
    return "This category is no longer available";
  }, [selectedCategory, selectedCategoryId]);

  const emptyDescription =
    selectedCategoryId === "all"
      ? "We are adding fresh favourites to the menu. Please check back soon."
      : "There are no active items in this category right now. Try another category instead.";

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-border-default md:p-6">
        <h1 className="font-heading font-extrabold text-h2 text-charcoal md:text-h1">
          Freshly Baked Pizzas & Sides
        </h1>
        <p className="mt-1 text-body text-bodySecondary">
          Handcrafted dough, rich San Marzano tomato sauce, and hot ingredients delivered fast.
        </p>
      </section>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {categories.length > 0 && (
          <CategoryNav
            categories={categories}
            activeCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        )}

        <div className="w-full flex-1">
          {isMenuLoading && <MenuSkeleton />}

          {isError && (
            <ErrorState
              message={(error as Error)?.message || "Failed to load menu items."}
              onRetry={() => void refetch()}
            />
          )}

          {!isMenuLoading && !isError && filteredProducts.length === 0 && (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={
                selectedCategoryId !== "all" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategoryId("all")}
                  >
                    Browse all items
                  </Button>
                ) : undefined
              }
            />
          )}

          {!isMenuLoading && !isError && filteredProducts.length > 0 && (
            <>
              {selectedCategory && (
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="font-heading text-h3 font-bold text-charcoal">
                    {selectedCategory.name}
                  </h2>
                  <span className="text-caption text-mutedGray">
                    {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <MenuItemCard
                    key={product.id}
                    product={product}
                    onSelect={(item) => setSelected(item)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ProductModal
        key={selected?.id ?? "closed"}
        product={selected}
        canAdd={selected ? products.some((product) => product.id === selected.id) : false}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}