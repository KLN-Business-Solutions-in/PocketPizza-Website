import { Spinner } from "@/components/ui/Spinner";

/**
 * Full-page / full-segment loading state — issue #39.
 *
 * The designed fallback used by every `loading.tsx` boundary. It is the single
 * place that announces loading to assistive tech: one polite `role="status"`
 * region with a visible label, so a screen reader hears the state once when the
 * route segment starts streaming and not repeatedly.
 *
 * Server-safe (no hooks) so it can live in a Next.js `loading.tsx`, which is a
 * Server Component by default.
 */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <Spinner size="lg" className="text-brand-red" />
      <span className="text-body text-bodySecondary">{label}</span>
    </div>
  );
}
