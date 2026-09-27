"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui/LayoutPrimitives";
import { useMenuFlat } from "@/lib/api/useMenu";
import { lineKey, useCartStore } from "@/lib/cart/store";

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

/** Removes persisted lines for items that are no longer returned as active menu items. */
export function CartReconciler() {
  const pathname = usePathname();
  const { products, isPending, isFetching, isError, refetch } = useMenuFlat();
  const cartSignature = useCartStore((state) =>
    state.lines.map((line) => lineKey(line)).join("|")
  );
  const reconcileAvailability = useCartStore((state) => state.reconcileAvailability);
  const setHydrated = useCartStore((state) => state.setHydrated);
  const [toast, setToast] = useState<ToastState>(null);
  const notifiedSignature = useRef("");
  const previousPathname = useRef(pathname);

  // Trigger rehydration on mount
  useEffect(() => {
    const rehydrate = async () => {
      try {
        await useCartStore.persist.rehydrate();
      } finally {
        setHydrated(true);
      }
    };
    rehydrate();
  }, [setHydrated]);

  useEffect(() => {
    const navigatedToCart = previousPathname.current !== pathname;
    if (
      navigatedToCart &&
      (pathname === "/cart" || pathname.startsWith("/checkout"))
    ) {
      void refetch();
    }
    previousPathname.current = pathname;
  }, [pathname, refetch]);

  useEffect(() => {
    if (isPending || isFetching || isError) return;

    const removals = reconcileAvailability(products);
    if (removals.length === 0) {
      notifiedSignature.current = "";
      return;
    }

    const signature = removals
      .map(({ line, reason }) => `${lineKey(line)}:${reason}`)
      .sort()
      .join("|");
    if (notifiedSignature.current === signature) return;
    notifiedSignature.current = signature;

    const names = Array.from(new Set(removals.map(({ line }) => line.displayName)));
    const subject = names.length === 1 ? `"${names[0]}"` : `${names.length} items`;
    const hasOptionChange = removals.some(
      ({ reason }) => reason === "VARIANT_UNAVAILABLE" || reason === "ADD_ON_UNAVAILABLE"
    );
    const message = hasOptionChange
      ? `${subject} ${names.length === 1 ? "has" : "have"} an unavailable customization and ${
          names.length === 1 ? "was" : "were"
        } removed from your cart.`
      : `${subject} ${names.length === 1 ? "is" : "are"} no longer available and ${
          names.length === 1 ? "was" : "were"
        } removed from your cart.`;

    // Defer the state update so the cart reconciliation itself is not a
    // cascading render, while still surfacing the removal immediately.
    window.setTimeout(() => setToast({ message, type: "error" }), 0);
  }, [cartSignature, isError, isFetching, isPending, products, reconcileAvailability]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return toast ? <Toast message={toast.message} type={toast.type} /> : null;
}

/** Hook to access cart hydration state for gating UI */
export function useCartHydrated() {
  return useCartStore((state) => state.hydrated);
}
