import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      <p className="font-heading text-display-l font-extrabold text-brand-red">404</p>
      <h1 className="mt-2 font-heading text-h3 font-bold text-charcoal">Page not found</h1>
      <p className="mt-2 text-body text-bodySecondary">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-brand-red px-4 py-2.5 font-heading text-button font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
        >
          Go home
        </Link>
        <Link
          href="/menu"
          className="inline-flex items-center justify-center rounded-md border border-border-default px-4 py-2.5 font-heading text-button font-semibold text-charcoal transition-colors hover:bg-cream-alt focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
        >
          Browse menu
        </Link>
      </div>
    </div>
  );
}
