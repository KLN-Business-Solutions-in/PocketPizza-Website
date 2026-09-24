import React from "react";
import { cn } from "@/lib/utils";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("rounded-md border border-border-default bg-white p-4 shadow-card", className)} {...props}>
    {children}
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse rounded-sm bg-neutralTint", className)} />
);

export const EmptyState: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div
    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-cream-bg p-8 text-center"
    role="status"
  >
    <h3 className="font-heading text-h4 font-bold text-charcoal">{title}</h3>
    <p className="mt-1 text-body text-bodySecondary">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-md border border-brand-red bg-status-errorBg p-4 text-center" role="alert">
    <p className="text-body text-brand-red font-medium">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="mt-2 text-caption font-bold text-brand-red underline">
        Retry Request
      </button>
    )}
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-modal border border-border-default bg-white p-6 shadow-elevated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-border-default pb-3">
          <h2 id="modal-title" className="font-heading text-h3 font-bold text-charcoal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="font-bold text-bodySecondary hover:text-charcoal"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{ message: string; type?: "success" | "error" }> = ({ message, type = "success" }) => (
  <div
    className={cn(
      "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md px-4 py-3 text-body font-medium shadow-elevated",
      type === "success"
        ? "border border-green-300 bg-status-successBg text-green-900"
        : "border border-brand-red bg-status-errorBg text-brand-red"
    )}
    role={type === "error" ? "alert" : "status"}
    aria-live={type === "error" ? "assertive" : "polite"}
  >
    {message}
  </div>
);