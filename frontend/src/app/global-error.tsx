"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Root error boundary — issue #39.
 *
 * Replaces the root layout when it (or anything above the segment error
 * boundaries) throws, so it must render its own <html>/<body> and import the
 * global stylesheet. Deliberately dependency-light: it cannot rely on the root
 * layout's fonts or providers.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-cream-bg text-charcoal antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-16 text-center">
          <div
            aria-hidden="true"
            className="grid h-14 w-14 place-items-center rounded-full bg-status-errorBg text-2xl"
          >
            ⚠️
          </div>
          <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-bodySecondary">
            The app hit an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-mutedGray">Reference: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
