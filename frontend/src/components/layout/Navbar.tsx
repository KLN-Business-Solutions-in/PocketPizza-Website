"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/menu", label: "Menu" },
  { href: "/#contact", label: "Contact" },
];

function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 7h15l-1.5 9h-12z" />
      <path d="M6 7l-1-4H2" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // TODO: read from cart store once implemented
  const cartCount = 0;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/menu") return pathname === "/menu" || pathname.startsWith("/menu");
    return false;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:h-16 md:px-10">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight">
          <span
            className="grid h-7 w-7 place-items-center rounded-md bg-brand-red text-sm text-white"
            aria-hidden="true"
          >
            🍕
          </span>
          <span className="text-charcoal">
            POKKET <span className="text-brand-red">PIZZA</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                "pb-1 transition-colors",
                isActive(l.href)
                  ? "border-b-2 border-brand-red text-brand-red"
                  : "text-charcoal hover:text-brand-red"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="flex items-center gap-1.5 rounded-full bg-blushTint px-4 py-2 font-heading text-xs font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white"
          >
            <BagIcon className="h-3.5 w-3.5" />
            Cart ({cartCount})
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-charcoal hover:bg-neutralTint md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="flex flex-col gap-1 border-t border-border-default bg-white px-5 py-3 md:hidden"
          aria-label="Mobile"
        >
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-2 py-2.5 font-heading text-sm font-semibold",
                isActive(l.href) ? "bg-blushTint text-brand-red" : "text-charcoal hover:bg-neutralTint"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
