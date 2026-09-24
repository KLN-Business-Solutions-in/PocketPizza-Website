"use client";

import { useMenu } from "@/lib/api/useMenu";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { MenuSkeleton } from "@/components/menu/MenuSkeleton";
import { ErrorState } from "@/components/ui/LayoutPrimitives";

export function Bestsellers() {
  const { data, isLoading, isError, refetch } = useMenu();

  if (isLoading) return <MenuSkeleton />;

  if (isError) {
    return <ErrorState message="Failed to load bestsellers." onRetry={() => refetch()} />;
  }

  // First three available products as signature picks
  const bestsellers = (data?.products ?? []).slice(0, 3);

  if (bestsellers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
      {bestsellers.map((product) => (
        <MenuItemCard
          key={product.id}
          product={product}
          onSelect={() => {
            // TODO: open ProductModal / add to cart once cart store exists
          }}
        />
      ))}
    </div>
  );
}
