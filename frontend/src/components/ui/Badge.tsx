import React from "react";
import { cn } from "@/lib/utils";

export const VegNonVegBadge: React.FC<{ type: "VEG" | "NON_VEG"; className?: string }> = ({ type, className }) => {
  const isVeg = type === "VEG";
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 p-0.5 border bg-white rounded-xs",
        isVeg ? "border-green-600" : "border-brand-red",
        className
      )}
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
    >
      <div className={cn("w-2 h-2 rounded-full", isVeg ? "bg-green-600" : "bg-brand-red")} />
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-xs text-tag font-medium bg-blushTint text-brand-red", className)}>
    {children}
  </span>
);