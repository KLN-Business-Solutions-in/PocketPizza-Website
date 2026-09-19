import React from "react";
<<<<<<< HEAD
import type { DietaryType } from "@shared/contracts";
import { cn } from "@/lib/utils";

export const VegNonVegBadge: React.FC<{ type: DietaryType; className?: string }> = ({ type, className }) => {
  const borderColor = type === "VEG" ? "border-green-600" : type === "EGG" ? "border-yellow-500" : "border-brand-red";
  const dotColor = type === "VEG" ? "bg-green-600" : type === "EGG" ? "bg-yellow-500" : "bg-brand-red";
  const title = type === "VEG" ? "Vegetarian" : type === "EGG" ? "Contains egg" : "Non-Vegetarian";
=======
import { cn } from "@/lib/utils";

export const VegNonVegBadge: React.FC<{ type: "VEG" | "NON_VEG"; className?: string }> = ({ type, className }) => {
  const isVeg = type === "VEG";
>>>>>>> 5914e06c3ee1682a8fe57220c1ccfa89ef2522a2
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 p-0.5 border bg-white rounded-xs",
<<<<<<< HEAD
        borderColor,
        className
      )}
      title={title}
    >
      <div className={cn("w-2 h-2 rounded-full", dotColor)} />
=======
        isVeg ? "border-green-600" : "border-brand-red",
        className
      )}
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
    >
      <div className={cn("w-2 h-2 rounded-full", isVeg ? "bg-green-600" : "bg-brand-red")} />
>>>>>>> 5914e06c3ee1682a8fe57220c1ccfa89ef2522a2
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-xs text-tag font-medium bg-blushTint text-brand-red", className)}>
    {children}
  </span>
);