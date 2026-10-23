"use client";

import React, { useMemo, useState } from "react";
import { useMenuFlat } from "@/lib/api/useMenu";
import { MenuSubNavbar, DietaryFilter } from "@/components/menu/MenuSubNavbar";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { ProductModal } from "@/components/menu/ProductModal";
import { EmptyState, ErrorState } from "@/components/ui/LayoutPrimitives";
import { useCartReconcile } from "@/hooks/useCartReconcile";
import type { MenuItem } from "@shared/contract/contract";

export function MenuContent() {
  const { categories, products, isLoading, isError, error, refetch } = useMenuFlat();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [dietary, setDietary] = useState<DietaryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "price-asc" | "price-desc" | "name">("popular");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  // Day 4: if anything already in the cart went inactive, drop it and toast —
  // the customer can be browsing the menu and find their cart changed under them.
  useCartReconcile();

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (selectedCategoryId !== "all") {
      const cat = categories.find((c) => c.id === selectedCategoryId);
      list = cat?.items ? [...cat.items] : [];
    }

    // Dietary filter
    if (dietary === "VEG") {
      list = list.filter((p) => p.isVeg);
    } else if (dietary === "NON_VEG") {
      list = list.filter((p) => !p.isVeg);
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description?.toLowerCase() || "").includes(query)
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      list.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, categories, selectedCategoryId, dietary, searchQuery, sortBy]);

  return (
    <div className="-mt-6 pb-12">
      {/* Intro hero banner — full-bleed; content spans the banner width */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-charcoal text-white p-6 md:p-8 overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block rounded-full bg-brand-red/90 px-3 py-1 font-heading text-xs font-bold tracking-wider uppercase text-white mb-2">
            Chef Crafted Menu
          </span>
          <h1 className="font-heading font-extrabold text-h2 md:text-h1 text-white tracking-tight">
            Everything we bake, in one place.
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-300">
            Hand-stretched pizza bases, slow-simmered sauces, and fresh gourmet toppings.
          </p>
        </div>
        {/* Subtle decorative pizza background accent */}
        <div className="absolute right-[-20px] bottom-[-20px] md:right-4 md:bottom-2 opacity-15 pointer-events-none text-8xl md:text-9xl select-none" aria-hidden="true">
          🍕
        </div>
      </section>

      {/* Sticky Sub Navbar with Search, Veg/Non-Veg, Sort & Category Chips */}
      {categories && (
        <MenuSubNavbar
          categories={categories}
          activeCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          dietary={dietary}
          onChangeDietary={setDietary}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          sortBy={sortBy}
          onChangeSortBy={setSortBy}
        />
      )}

      {/* Content Area */}
      <div className="mt-6 w-full">
        {/* Loading State */}
        {isLoading && <MenuSkeleton />}

        {/* Error State */}
        {isError && (
          <ErrorState
            message={(error as Error)?.message || "Failed to load menu items."}
            onRetry={() => refetch()}
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredProducts.length === 0 && (
          <EmptyState
            title="No dishes found"
            description={
              searchQuery
                ? `No dishes match "${searchQuery}". Try clearing search or altering your filters.`
                : "Try selecting another category or check back later for new additions."
            }
          />
        )}

        {/* Responsive Item Grid: 1 col mobile, 2 cols sm, 3 cols md, 4 cols lg */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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

      {/*
        Keyed by product id so opening a different item remounts the modal and
        its variant/add-on/quantity state resets naturally. Doing this with an
        effect instead would cascade an extra render on every open.
      */}
      <ProductModal
        key={selected?.id ?? "no-product"}
        product={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
