"use client";

import React from "react";
import type { Category } from "@shared/contract/contract";
import { cn } from "@/lib/utils";

export type DietaryFilter = "ALL" | "VEG" | "NON_VEG";

interface MenuSubNavbarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  dietary: DietaryFilter;
  onChangeDietary: (d: DietaryFilter) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  sortBy: "popular" | "price-asc" | "price-desc" | "name";
  onChangeSortBy: (sort: "popular" | "price-asc" | "price-desc" | "name") => void;
}

export function MenuSubNavbar({
  categories,
  activeCategoryId,
  onSelectCategory,
  dietary,
  onChangeDietary,
  searchQuery,
  onChangeSearch,
  sortBy,
  onChangeSortBy,
}: MenuSubNavbarProps) {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="sticky top-14 md:top-16 z-30 ml-[calc(50%_-_50vw)] mr-[calc(50%_-_50vw)] bg-white/95 backdrop-blur-md border-b border-border-default shadow-sm transition-all py-2.5">
      <div className="mx-auto w-full max-w-6xl px-5 md:px-10 flex flex-wrap items-center justify-between gap-2.5">
        {/* Search input with search icon */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-mutedGray">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Search pizza, pasta, sides..."
            className="w-full rounded-full border border-border-default bg-neutralTint/60 py-1.5 pl-8 pr-8 text-xs text-charcoal placeholder-bodySecondary transition-all focus:border-brand-red focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearch("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-mutedGray hover:text-charcoal"
              aria-label="Clear search"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Right controls: Category Dropdown, Dietary Toggle, Sort Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={activeCategoryId}
              aria-label="Select category"
              onChange={(e) => onSelectCategory(e.target.value)}
              className="appearance-none rounded-full border border-border-default bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-charcoal shadow-xs hover:border-brand-red/40 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 cursor-pointer"
            >
              <option value="all">All Dishes</option>
              {sortedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-mutedGray">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Dietary toggle chips: All / Veg / Non-Veg */}
          <div className="flex items-center bg-neutralTint p-0.5 rounded-full border border-border-default/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onChangeDietary("ALL")}
              className={cn(
                "px-3 py-1 rounded-full transition-all text-xs",
                dietary === "ALL"
                  ? "bg-white text-charcoal shadow-xs font-bold"
                  : "text-bodySecondary hover:text-charcoal"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChangeDietary("VEG")}
              className={cn(
                "px-3 py-1 rounded-full transition-all text-xs",
                dietary === "VEG"
                  ? "bg-[#25D366] text-white shadow-xs font-bold"
                  : "text-bodySecondary hover:text-charcoal"
              )}
            >
              Veg
            </button>
            <button
              type="button"
              onClick={() => onChangeDietary("NON_VEG")}
              className={cn(
                "px-3 py-1 rounded-full transition-all text-xs",
                dietary === "NON_VEG"
                  ? "bg-[#D62828] text-white shadow-xs font-bold"
                  : "text-bodySecondary hover:text-charcoal"
              )}
            >
              Non-Veg
            </button>
          </div>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sortBy}
              aria-label="Sort dishes"
              onChange={(e) => onChangeSortBy(e.target.value as MenuSubNavbarProps["sortBy"])}
              className="appearance-none rounded-full border border-border-default bg-neutralTint/60 py-1.5 pl-3 pr-8 text-xs font-semibold text-charcoal focus:border-brand-red focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 cursor-pointer"
            >
              <option value="popular">Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name A-Z</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-mutedGray">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
