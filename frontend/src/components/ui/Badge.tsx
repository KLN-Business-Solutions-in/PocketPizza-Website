import React from "react";
import { cn } from "@/lib/utils";

/**
 * Veg indicator — canonical contract uses `isVeg: boolean` (§7 menu).
 * Legacy `dietaryType` (VEG/NON_VEG/EGG) is removed.
 */
export const VegNonVegBadge: React.FC<{
  isVeg: boolean;
  /** @deprecated pass isVeg instead */
  type?: "VEG" | "NON_VEG" | "EGG" | boolean;
  className?: string;
}> = ({ isVeg, type, className }) => {
  const veg = typeof type === "boolean" ? type : typeof type === "string" ? type === "VEG" : isVeg;
  const borderColor = veg ? "border-green-600" : "border-brand-red";
  const dotColor = veg ? "bg-green-600" : "bg-brand-red";
  const title = veg ? "Vegetarian" : "Non-Vegetarian";
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 p-0.5 border bg-white rounded-xs",
        borderColor,
        className
      )}
      title={title}
    >
      <div className={cn("w-2 h-2 rounded-full", dotColor)} />
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-xs text-tag font-medium bg-blushTint text-brand-red", className)}>
    {children}
  </span>
);