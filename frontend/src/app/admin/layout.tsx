"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminLogout, useAdminSession } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { Logo } from "@/components/ui/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminLogout();
  const session = useAdminSession();
  const toast = useToast();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    if (pathname !== "/admin/login" && session.data?.ok === false) {
      router.replace("/admin/login?reason=expired");
    }
  }, [pathname, session.data, router]);

  // On login page, render child component directly without admin layout shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (session.isLoading || session.data?.ok === false) {
    return <p className="p-6 text-body text-bodySecondary">Checking your session…</p>;
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      // Hard redirect to ensure all local state/cache is fully wiped
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin/login";
    } catch (e) {
      console.error("Logout error:", e);
      toast.push("Logout failed. Please try again.", "error");
    }
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Orders Kanban" },
    { href: "/admin/orders/history", label: "Order History" },
    { href: "/admin/menu-manager", label: "Menu Manager" },
  ];

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border-default bg-white shadow-card">
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-2">
            <Logo className="h-9 w-auto" />
            <span className="font-heading text-xl font-extrabold tracking-tight text-brand-red">
              Pokket Pizza
            </span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-caption font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-red text-white"
                      : "text-bodySecondary hover:bg-neutralTint hover:text-charcoal"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={logout.isPending}
            >
              Logout
            </Button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border-default text-charcoal hover:bg-neutralTint focus:outline-none focus:ring-2 focus:ring-brand-red sm:hidden"
              aria-label={mobileNavOpen ? "Close admin navigation" : "Open admin navigation"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span aria-hidden="true" className="text-xl leading-none">{mobileNavOpen ? "×" : "☰"}</span>
            </button>
          </div>
          {mobileNavOpen && (
            <nav aria-label="Admin navigation" className="absolute left-4 right-4 top-full z-50 mt-2 flex flex-col rounded-xl border border-border-default bg-white p-2 shadow-card sm:hidden">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`min-h-11 rounded-lg px-3 py-3 text-body font-semibold ${isActive ? "bg-brand-red text-white" : "text-bodySecondary hover:bg-neutralTint hover:text-charcoal"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
