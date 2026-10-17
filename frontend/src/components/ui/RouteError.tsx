"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Shared, designed error boundary UI — issue #39.
 *
 * Every `error.tsx` boundary re-exports this so a thrown render error becomes a
 * branded, retryable state instead of a raw Next.js stack trace. `retry()` is
 * the stable Next.js 16 recover function (re-fetches and re-renders the
 * segment); the "Go home" link is path-aware so an admin error returns to the
 * admin panel rather than the storefront.
 */
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
}) {
  const pathname = usePathname();
  const homeHref = pathname?.startsWith("/admin") ? "/admin/dashboard" : "/";

  useEffect(() => {
    // Surface the error for local debugging; production shows only the digest.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-16 text-center">
      <div
        aria-hidden="true"
        className="grid h-14 w-14 place-items-center rounded-full bg-status-errorBg text-2xl"
      >
        ⚠️
      </div>
      <h2 className="mt-4 font-heading text-h3 font-bold text-charcoal">{title}</h2>
      <p className="mt-2 text-body text-bodySecondary">
        We couldn&apos;t load this section. This is usually temporary — please try again.
      </p>
      {error.digest && (
        <p className="mt-1 text-caption text-mutedGray">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href={homeHref}>
          <Button variant="outline">Go home</Button>
        </Link>
      </div>
    </div>
  );
}
