"use client";

import React from "react";
import type { Category } from "@shared/contract/contract";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  vegOnly: boolean;
  onToggleVeg: (v: boolean) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  vegOnly,
  onToggleVeg,
}) => {
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const categoryChip = (id: string, label: string, active: boolean) => (
    <button
      key={id}
      onClick={() => onSelectCategory(id)}
      className={cn(
        "whitespace-nowrap px-4 py-2 rounded-2xl text-label font-heading font-semibold transition-all border",
        active
          ? "bg-brand-red text-white border-brand-red shadow-card"
          : "bg-white text-charcoal border-border-default hover:bg-neutralTint"
      )}
    >
      {label}
    </button>
  );

  return (
    <nav className="w-full lg:w-64 flex-shrink-0 sticky top-16 lg:top-20">
      {/* Mobile & Tablet: Horizontal Scrollable Chips */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-none no-scrollbar -mx-4 px-4 sticky top-16 bg-cream-bg/95 backdrop-blur z-30 pt-2 border-b border-border-default">
        <button
          onClick={() => onToggleVeg(!vegOnly)}
          className={cn(
            "whitespace-nowrap px-3 py-1.5 rounded-xl text-label font-heading font-semibold transition-all border",
            vegOnly
              ? "bg-[#25D366] text-white border-[#25D366] shadow-card"
              : "bg-white text-charcoal border-border-default hover:bg-neutralTint"
          )}
        >
          Veg Only
        </button>
        {categoryChip("all", "All Items", activeCategoryId === "all")}
        {sorted.map((cat) => (
          categoryChip(cat.id, cat.name, activeCategoryId === cat.id)
        ))}
      </div>

      {/* Desktop: Fixed/Sticky Vertical Sidebar */}
      <div className="hidden lg:flex flex-col gap-1 sticky top-20 bg-white p-3 rounded-xl border border-border-default shadow-card">
        <h2 className="px-3 py-2 text-caption font-bold text-mutedGray uppercase tracking-wider">
          Categories
        </h2>
        <button
          onClick={() => onToggleVeg(!vegOnly)}
          className={cn(
            "w-full text-left px-3.5 py-2.5 rounded-md text-button font-heading font-semibold transition-all flex items-center justify-between border",
            vegOnly
              ? "bg-[#25D366] text-white border-[#25D366] shadow-card"
              : "text-charcoal hover:bg-neutralTint border-border-default"
          )}
        >
          <span>Veg Only</span>
          {vegOnly ? "●" : "○"}
        </button>
        {sorted.map((cat) => (
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
