"use client";

import { useMenuFlat } from "@/lib/api/useMenu";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { ErrorState } from "@/components/ui/LayoutPrimitives";
import { ProductModal } from "@/components/menu/ProductModal";
import type { MenuItem } from "@shared/contract/contract";
import React from "react";

export function Bestsellers() {
  const { products, isLoading, isError, refetch } = useMenuFlat();
  const [selected, setSelected] = React.useState<MenuItem | null>(null);

  if (isLoading) return <MenuSkeleton />;

  if (isError) {
    return <ErrorState message="Failed to load bestsellers." onRetry={() => refetch()} />;
  }

  // First three items across categories as signature picks
  const bestsellers = (products ?? []).slice(0, 3);

  if (bestsellers.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {bestsellers.map((product) => (
          <MenuItemCard
            key={product.id}
            product={product}
            onSelect={(p) => setSelected(p)}
          />
        ))}
      </div>
      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
