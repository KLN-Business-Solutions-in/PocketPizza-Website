"use client";

<<<<<<< HEAD
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
          Freshly Baked Pizzas &amp; Sides
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
=======
import { useQuery } from "@tanstack/react-query";
import { Category, Product } from "@shared/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

async function fetchMenu(): Promise<{ categories: Category[]; products: Product[] }> {
  const res = await fetch(`${API_BASE}/menu`);
  if (!res.ok) throw new Error("Failed to fetch menu");
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "Failed to fetch menu");
  return data.data;
}

export function MenuContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });

  if (isLoading) return <div className="text-center py-8">Loading menu...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Error: {(error as Error).message}</div>;
  if (!data) return <div className="text-center py-8">No menu data</div>;

  const { categories, products } = data;

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryProducts = products.filter((p) => p.categoryId === category.id);
        return (
          <section key={category.id} className="space-y-4">
            <h2 className="text-h3 font-heading font-bold text-charcoal">{category.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categoryProducts.map((product) => (
                <article
                  key={product.id}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full bg-white/90 backdrop-blur-sm">
                      {product.dietaryType}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="font-bold text-charcoal">
                        ${(product.basePrice / 100).toFixed(2)}
                      </span>
                      {product.variants.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {product.variants.length} size{product.variants.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
>>>>>>> 5914e06c3ee1682a8fe57220c1ccfa89ef2522a2
