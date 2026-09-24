"use client";

import React from "react";
import type { Category } from "@shared/contract/contract";
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
  const sorted = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );

  const chipClassName = (isActive: boolean) =>
    cn(
      "whitespace-nowrap rounded-2xl border px-4 py-2 font-heading text-label font-semibold transition-all",
      isActive
        ? "border-brand-red bg-brand-red text-white shadow-card"
        : "border-border-default bg-white text-charcoal hover:bg-neutralTint"
    );

  const sidebarClassName = (isActive: boolean) =>
    cn(
      "flex w-full items-center justify-between rounded-md px-3.5 py-2.5 text-left font-heading text-button font-semibold transition-all",
      isActive
        ? "border-l-4 border-brand-red bg-blushTint font-bold text-brand-red"
        : "text-charcoal hover:bg-neutralTint"
    );

  return (
    <nav className="w-full flex-shrink-0 lg:w-64" aria-label="Menu categories">
      <div className="no-scrollbar sticky top-16 -mx-4 flex gap-2 overflow-x-auto border-b border-border-default bg-cream-bg/95 px-4 pb-2 pt-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={chipClassName(activeCategoryId === "all")}
          aria-current={activeCategoryId === "all" ? "page" : undefined}
        >
          All Items
        </button>
        {sorted.map((category) => {
          const isActive = activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={chipClassName(isActive)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Browse ${category.name} category`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="sticky top-20 hidden flex-col gap-1 rounded-xl border border-border-default bg-white p-3 shadow-card lg:flex">
        <h2 className="px-3 py-2 text-caption font-bold uppercase tracking-wider text-mutedGray">
          Categories
        </h2>
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={sidebarClassName(activeCategoryId === "all")}
          aria-current={activeCategoryId === "all" ? "page" : undefined}
        >
          All Items
        </button>
        {sorted.map((category) => {
          const isActive = activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={sidebarClassName(isActive)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Browse ${category.name} category`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
