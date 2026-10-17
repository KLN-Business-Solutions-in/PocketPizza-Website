import { cn } from "@/lib/utils";

/**
 * Shared circular loading spinner — issue #39.
 *
 * The single, site-wide loading glyph. Kept dependency-free and colour-agnostic
 * (`currentColor`) so the same component works inline inside a button, centred
 * in a card, or as a full-page overlay. Colour is set by the caller via a text
 * utility (e.g. `text-brand-red`), always from a design token.
 *
 * Accessibility: the visual ring is decorative (`aria-hidden`). Pass a `label`
 * to wrap it in a polite `role="status"` region with a screen-reader-only
 * description; omit `label` when a visible label already sits next to it or
 * when the spinner is purely decorative, so nothing is announced twice.
 *
 * Motion: `motion-reduce:animate-none` honours `prefers-reduced-motion` — the
 * ring stays visible as a static, non-animating indicator.
 */

const SIZE_CLASSES = {
  xs: "h-3.5 w-3.5 border-2",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
} as const;

export type SpinnerSize = keyof typeof SIZE_CLASSES;

type SpinnerProps = {
  size?: SpinnerSize;
  /** Screen-reader-only description. When set, the spinner announces status. */
  label?: string;
  className?: string;
};

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  const ring = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent motion-reduce:animate-none",
        SIZE_CLASSES[size],
        className
      )}
    />
  );

  if (!label) return ring;

  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  );
}
