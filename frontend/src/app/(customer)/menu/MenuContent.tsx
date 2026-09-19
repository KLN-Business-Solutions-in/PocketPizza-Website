"use client";

import React, { useMemo, useState } from "react";
import { useMenu } from "@/lib/api/useMenu";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { EmptyState, ErrorState } from "@/components/ui/LayoutPrimitives";

export function MenuContent() {
  const { data, isLoading, isError, error, refetch } = useMenu();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const products = data?.products;

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (selectedCategoryId === "all") return products;
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Intro banner */}
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-border-default md:p-6">
        <h1 className="font-heading font-extrabold text-h2 md:text-h1 text-charcoal">
          Freshly Baked Pizzas & Sides
        </h1>
        <p className="mt-1 text-body text-bodySecondary">
          Handcrafted dough, rich San Marzano tomato sauce, and hot ingredients delivered fast.
        </p>
      </section>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Category Navigation */}
        {data?.categories && (
          <CategoryNav
            categories={data.categories}
            activeCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 w-full">
          {/* Loading State */}
          {isLoading && <MenuSkeleton />}

          {/* Error State */}
          {isError && (
            <ErrorState
              message={error?.message || "Failed to load menu items."}
              onRetry={() => refetch()}
            />
          )}

          {/* Empty Category State */}
          {!isLoading && !isError && filteredProducts.length === 0 && (
            <EmptyState
              title="No items found in this category"
              description="Try selecting another category or check back later for new additions."
            />
          )}

          {/* Responsive Item Grid: 1 col mobile, 2 cols sm, 3 cols lg */}
          {!isLoading && !isError && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <MenuItemCard
                  key={product.id}
                  product={product}
                  onSelect={() => {
                    // TODO: open ProductModal once implemented
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
