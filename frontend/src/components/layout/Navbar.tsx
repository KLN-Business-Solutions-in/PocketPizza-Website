"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCartHydrated, useCartStore } from "@/lib/cart/store";
import { useCustomerLogout, useCustomerSession } from "@/lib/api/customerAuth";
import { useToast } from "@/components/ui/ToastProvider";
import { Logo } from "@/components/ui/Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/menu", label: "Menu" },
  { href: "/contact", label: "Contact" },
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Gate on hydration so the server-rendered markup and the first client
  // render agree; the badge fills in once localStorage has been read.
  const hasHydrated = useCartHydrated();
  const cartCount = useCartStore((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const session = useCustomerSession();
  const logout = useCustomerLogout();
  const toast = useToast();
  const customer = session.data?.loggedIn ? session.data.customer : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logout.mutateAsync();
      router.replace("/");
    } catch {
      toast.push("Unable to log out. Please try again.", "error");
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/menu") return pathname === "/menu" || pathname.startsWith("/menu");
    if (href === "/about") return pathname === "/about";
    if (href === "/contact") return pathname === "/contact";
    return false;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-5 md:h-16 md:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-heading text-base font-extrabold tracking-tight sm:gap-2 sm:text-lg">
          <Logo className="h-8 w-auto sm:h-9" />
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

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {customer ? (
            <div ref={profileRef} className="relative">
              <button
                type="button"
                aria-label="Profile"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="grid h-11 w-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-neutralTint focus:outline-none focus:ring-2 focus:ring-brand-red"
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-blushTint font-heading text-xs font-bold text-brand-red"
                  aria-hidden="true"
                >
                  {customer.name.trim().charAt(0).toUpperCase()}
                </span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Profile"
                  className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border border-border-default bg-white py-1 shadow-elevated"
                >
                  <div className="border-b border-border-default px-3 py-2">
                    <p className="truncate font-heading text-label font-semibold text-charcoal">
                      {customer.name}
                    </p>
                    <p className="truncate text-caption text-bodySecondary">{customer.phone}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile");
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm font-medium text-charcoal hover:bg-neutralTint focus-visible:bg-neutralTint focus:outline-none"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm font-medium text-charcoal hover:bg-neutralTint focus-visible:bg-neutralTint focus:outline-none"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="w-full px-3 py-2.5 text-left text-sm font-medium text-charcoal hover:bg-neutralTint focus-visible:bg-neutralTint focus:outline-none disabled:opacity-50"
                  >
                    {logout.isPending ? "Logging out…" : "Log out"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <Link
            href="/cart"
            aria-label={hasHydrated ? `Cart (${cartCount})` : "Cart"}
            className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 font-heading text-xs font-semibold text-brand-red transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red sm:w-auto sm:gap-1.5 sm:bg-blushTint sm:px-4 sm:hover:bg-brand-red sm:hover:text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blushTint transition-colors group-hover:bg-brand-red group-hover:text-white sm:h-auto sm:w-auto sm:bg-transparent sm:group-hover:bg-transparent sm:group-hover:text-inherit">
              <BagIcon className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">{hasHydrated ? `Cart (${cartCount})` : "Cart"}</span>
          </Link>
          {!customer && (
            <Link href="/login" className="whitespace-nowrap rounded-md px-1.5 py-2 text-xs font-semibold text-charcoal hover:text-brand-red sm:px-2">
              Log in
            </Link>
          )}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-md text-charcoal hover:bg-neutralTint md:hidden"
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
