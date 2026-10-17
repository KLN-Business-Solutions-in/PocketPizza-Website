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

function SettingsIcon({ className }: { className?: string }) {
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
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

  useEffect(() => setMenuOpen(false), [pathname]);

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
                  className="grid h-7 w-7 place-items-center rounded-full bg-blushTint font-heading text-xs font-bold text-brand-red"
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
          {customer ? (
            <Link
              href="/settings"
              aria-label="Settings"
              className="grid h-11 w-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-neutralTint focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              <SettingsIcon className="h-5 w-5" />
            </Link>
          ) : null}
          <Link
            href="/cart"
            aria-label={hasHydrated ? `Cart (${cartCount})` : "Cart"}
            className="flex items-center gap-1 rounded-full bg-blushTint px-2.5 py-2 font-heading text-xs font-semibold text-brand-red transition-colors hover:bg-brand-red hover:text-white sm:gap-1.5 sm:px-4"
          >
            <BagIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{hasHydrated ? `Cart (${cartCount})` : "Cart"}</span>
          </Link>
          {!customer && (
            <Link href="/login" className="whitespace-nowrap rounded-md px-1.5 py-2 text-xs font-semibold text-charcoal hover:text-brand-red sm:px-2">
              Log in
            </Link>
          )}
          <button
            type="button"
            className="grid h-9 w-8 place-items-center rounded-md text-charcoal hover:bg-neutralTint sm:w-9 md:hidden"
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
          {[
            ...(customer
              ? [
                  { href: "/profile", label: "Profile" },
                  { href: "/settings", label: "Settings" },
                ]
              : []),
            ...links,
          ].map((l) => (
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
