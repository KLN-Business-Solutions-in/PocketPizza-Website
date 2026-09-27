"use client";

import React from "react";
import { Input } from "@/components/ui/Input";

/**
 * Thin react-hook-form field wrapper.
 *
 * Keeps the three things the sprint asks for in one place so no field can ship
 * without them: an inline error bound to the field's `formState.errors`, the
 * matching `aria-invalid` / `aria-describedby` wiring for screen readers, and
 * the mobile-keyboard hints (`inputMode`) where the field is numeric.
 */
export type FieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = React.forwardRef<
  HTMLInputElement,
  FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "ref">
>(function TextField({ name, label, error, hint, id, className, ...props }, ref) {
  const inputId = id ?? `field-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  return (
    <>
      <Input
        ref={ref}
        id={inputId}
        name={name}
        label={label}
        error={error}
        className={className}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...props}
      />
      {/*
        Input renders the visible message; these live-only nodes exist purely to
        give assistive tech a stable target for aria-describedby.
      */}
      {error && <span id={errorId} className="sr-only" />}
      {!error && hint && <span id={hintId} className="sr-only">{hint}</span>}
    </>
  );
});

/** Numeric variant: numeric mobile keyboard regardless of device locale. */
export const NumericField = React.forwardRef<
  HTMLInputElement,
  FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "ref">
>(function NumericField(props, ref) {
  return <TextField ref={ref} inputMode="numeric" pattern="[0-9]*" autoComplete="off" {...props} />;
});
