"use client";

<<<<<<< HEAD
import React, { useMemo, useState } from "react";
import { useMenuFlat } from "@/lib/api/useMenu";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { ProductModal } from "@/components/menu/ProductModal";
import { EmptyState, ErrorState } from "@/components/ui/LayoutPrimitives";
import type { MenuItem } from "@shared/contract/contract";

export function MenuContent() {
  const { categories, products, isLoading, isError, error, refetch } = useMenuFlat();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === "all") return products;
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat?.items ?? [];
  }, [products, categories, selectedCategoryId]);

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
        {categories && (
          <CategoryNav
            categories={categories}
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
              message={(error as Error)?.message || "Failed to load menu items."}
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
                  onSelect={(p) => setSelected(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductModal product={selected} onClose={() => setSelected(null)} />
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
