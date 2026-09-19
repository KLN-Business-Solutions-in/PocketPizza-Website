"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { Product } from "@shared/contracts";
import { VegNonVegBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface MenuItemCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80";

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, onSelect }) => {
  // Parent renders with key={product.id}, so a fresh mount per product makes
  // initialising from props safe (no prop-sync effect needed).
  const [imgSrc, setImgSrc] = useState(product.imageUrl || PLACEHOLDER_IMAGE);

  // Convert cents to currency format (e.g. 1299 -> ₹12.99 or $12.99)
  const formattedPrice = (product.basePrice / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="flex flex-col justify-between rounded-lg border border-border-default bg-white overflow-hidden shadow-card hover:shadow-elevated transition-all group">
      <div>
        {/* Responsive Image Container */}
        <div className="relative w-full h-44 bg-neutralTint overflow-hidden">
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
            priority={false}
          />
          <div className="absolute top-2.5 left-2.5 z-10">
            <VegNonVegBadge type={product.dietaryType} />
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading font-bold text-h4 text-charcoal line-clamp-1">
              {product.name}
            </h3>
          </div>
          <p className="mt-1 text-caption text-bodySecondary line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="p-4 pt-0 flex items-center justify-between mt-2">
        <div>
          <span className="text-tag text-mutedGray block uppercase tracking-wide">Starting at</span>
          <span className="font-heading font-extrabold text-h4 text-charcoal">{formattedPrice}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => onSelect(product)}>
          {product.variants.length > 0 ? "Customise" : "Add +"}
        </Button>
      </div>
    </div>
  );
};