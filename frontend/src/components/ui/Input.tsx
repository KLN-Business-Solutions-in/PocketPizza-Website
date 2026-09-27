import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, name, ...props }, ref) => {
    const inputId = id ?? name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const describedBy = [props["aria-describedby"], error ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block mb-1.5 text-label font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "w-full rounded-sm border border-border-default bg-offWhiteAlt px-3.5 py-2 text-body text-charcoal placeholder:text-mutedGray focus:border-border-active focus:outline-none focus:ring-1 focus:ring-border-active disabled:bg-neutralTint",
            error && "border-brand-red focus:border-brand-red focus:ring-brand-red",
            className
          )}
          {...props}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-caption text-brand-red">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";