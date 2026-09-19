import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block mb-1.5 text-label font-medium text-charcoal">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-sm border border-border-default bg-offWhiteAlt px-3.5 py-2 text-body text-charcoal placeholder:text-mutedGray focus:border-border-active focus:outline-none focus:ring-1 focus:ring-border-active disabled:bg-neutralTint",
            error && "border-brand-red focus:border-brand-red focus:ring-brand-red",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-caption text-brand-red">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";