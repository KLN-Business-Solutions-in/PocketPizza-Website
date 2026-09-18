import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-brand-red text-white hover:bg-red-700 focus:ring-brand-red",
      secondary: "bg-charcoal text-white hover:bg-charcoal-alt focus:ring-charcoal",
      outline: "border border-border-default text-charcoal hover:bg-cream-alt focus:ring-brand-red",
      ghost: "text-bodySecondary hover:bg-neutralTint focus:ring-mutedGray",
      danger: "bg-status-errorBg text-brand-red border border-brand-red hover:bg-red-100 focus:ring-brand-red",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-caption rounded-sm font-medium",
      md: "px-4 py-2.5 text-button rounded-md font-semibold",
      lg: "px-6 py-3.5 text-button rounded-2xl font-bold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-heading transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";