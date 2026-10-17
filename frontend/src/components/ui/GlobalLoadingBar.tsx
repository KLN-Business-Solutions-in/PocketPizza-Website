"use client";

import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Global, data-level loading indicator — issue #39.
 *
 * A thin, indeterminate bar pinned to the top of the viewport that reflects the
 * TanStack Query cache: it appears while a query is loading for the first time
 * (no cached data yet) or while a mutation (submit) is in flight, and vanishes
 * once everything settles.
 *
 * Deliberate choices:
 * - **Initial loads + mutations only.** `predicate` excludes background
 *   refetches, so periodic polling (the admin board refetches every 12s) never
 *   flashes the bar. The bar is the *subtle* treatment; full-screen feedback for
 *   navigation belongs to the route-level `loading.tsx` boundaries, which take
 *   precedence and never fight this element.
 * - **Delay + decorative.** Shown only after 150ms so fast resolves do not
 *   flicker, and `aria-hidden` so it never competes with the `PageLoader`
 *   announcement — the loading state is announced exactly once.
 */
export function GlobalLoadingBar() {
  const initialLoads = useIsFetching({
    predicate: (query) => query.state.status === "pending",
  });
  const mutations = useIsMutating();
  const busy = initialLoads + mutations > 0;

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
    >
      <div
        className={cn(
          "h-full w-1/3 bg-brand-red",
          visible ? "pokket-loading-bar opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
