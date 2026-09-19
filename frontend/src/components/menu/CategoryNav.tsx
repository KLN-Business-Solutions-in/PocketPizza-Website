"use client";

import React from "react";
import type { Category } from "@shared/contracts";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  return (
    <nav className="w-full lg:w-64 flex-shrink-0">
      {/* Mobile & Tablet: Horizontal Scrollable Chips */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-none no-scrollbar -mx-4 px-4 sticky top-16 bg-cream-bg/95 backdrop-blur z-30 pt-2 border-b border-border-default">
        <button
          onClick={() => onSelectCategory("all")}
          className={cn(
            "whitespace-nowrap px-4 py-2 rounded-2xl text-label font-heading font-semibold transition-all border",
            activeCategoryId === "all"
              ? "bg-brand-red text-white border-brand-red shadow-card"
              : "bg-white text-charcoal border-border-default hover:bg-neutralTint"
          )}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-2xl text-label font-heading font-semibold transition-all border",
              activeCategoryId === cat.id
                ? "bg-brand-red text-white border-brand-red shadow-card"
                : "bg-white text-charcoal border-border-default hover:bg-neutralTint"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Desktop: Fixed/Sticky Vertical Sidebar */}
      <div className="hidden lg:flex flex-col gap-1 sticky top-20 bg-white p-3 rounded-xl border border-border-default shadow-card">
        <h2 className="px-3 py-2 text-caption font-bold text-mutedGray uppercase tracking-wider">
          Categories
        </h2>
        <button
          onClick={() => onSelectCategory("all")}
          className={cn(
            "w-full text-left px-3.5 py-2.5 rounded-md text-button font-heading font-semibold transition-all flex items-center justify-between",
            activeCategoryId === "all"
              ? "bg-blushTint text-brand-red border-l-4 border-brand-red font-bold"
              : "text-charcoal hover:bg-neutralTint"
          )}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-md text-button font-heading font-semibold transition-all flex items-center justify-between",
              activeCategoryId === cat.id
                ? "bg-blushTint text-brand-red border-l-4 border-brand-red font-bold"
                : "text-charcoal hover:bg-neutralTint"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
};