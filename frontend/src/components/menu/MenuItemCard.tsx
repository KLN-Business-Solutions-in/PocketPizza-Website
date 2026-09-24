"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { MenuItem } from "@shared/contract/contract";
import { VegNonVegBadge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/money";

interface MenuItemCardProps {
  product: MenuItem;
  onSelect: (product: MenuItem) => void;
}

const PLACEHOLDER_IMAGE = "/menu-placeholder.svg";
const BLUR_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='%23f5f3ee'/%3E%3C/svg%3E";

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, onSelect }) => {
  const imageSource = product.imageUrl || PLACEHOLDER_IMAGE;
  const [failedImageSource, setFailedImageSource] = useState<string | null>(null);
  const description = product.description?.trim() || "A tasty pick from our kitchen.";
  const formattedPrice = formatINR(product.basePrice);
  const imgSrc = failedImageSource === imageSource ? PLACEHOLDER_IMAGE : imageSource;

  const handleImageError = () => setFailedImageSource(imageSource);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border-default bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="relative h-44 w-full overflow-hidden bg-neutralTint">
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          unoptimized={imgSrc === PLACEHOLDER_IMAGE}
          onError={handleImageError}
        />
        <div className="absolute left-2.5 top-2.5 z-10">
          <VegNonVegBadge isVeg={product.isVeg} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div>
          <h3 className="line-clamp-1 font-heading text-h4 font-bold text-charcoal">
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-bodySecondary">
            {description}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <span className="block text-tag uppercase tracking-wide text-mutedGray">Base price</span>
            <span className="font-heading text-h4 font-extrabold text-brand-red">
              {formattedPrice}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="rounded-full bg-blushTint px-4 py-2 font-heading text-xs font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
          >
            {product.variants.length > 0 || product.addOns.length > 0 ? "Customise" : "View details"}
          </button>
        </div>
      </div>
    </article>
  );
};
