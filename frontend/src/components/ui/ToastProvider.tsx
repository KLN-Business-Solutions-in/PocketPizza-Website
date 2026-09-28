"use client";

import React from "react";
import { Toast } from "@/components/ui/LayoutPrimitives";

/**
 * Minimal toast queue. Day 4 needs customer-visible feedback when a cart line
 * is evicted because the item went inactive; nothing else in the app wanted
 * notifications before, which is why the bare `Toast` primitive had no
 * consumer. Auto-dismisses so a single mounted provider is enough.
 */

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastKind;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (message: string, type?: ToastKind) => void;
  dismiss: (id: number) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = React.useCallback(
    (message: string, type: ToastKind = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, type }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      );
    },
    [dismiss]
  );

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <Toast message={t.message} type={t.type} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
