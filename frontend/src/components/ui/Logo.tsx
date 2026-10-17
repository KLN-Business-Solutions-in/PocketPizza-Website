import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Set when the logo is the only branding in view; empty means decorative. */
  alt?: string;
}

/**
 * Brand logo lockup mark. The artwork is a static SVG in `public/`, so a plain
 * <img> is used instead of next/image (the optimizer refuses SVG unless
 * `dangerouslyAllowSVG` is enabled).
 */
export function Logo({ className, alt = "" }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt={alt}
      width={503}
      height={325}
      draggable={false}
      className={cn("h-9 w-auto shrink-0 select-none", className)}
    />
  );
}
