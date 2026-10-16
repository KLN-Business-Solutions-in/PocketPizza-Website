"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminLogout, useAdminSession } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminLogout();
  const session = useAdminSession();
  const toast = useToast();

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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/admin/dashboard" className="flex shrink-0 items-center">
            <span className="font-heading text-xl font-extrabold tracking-tight text-brand-red">
              Pokket Pizza
            </span>
          </Link>
          <nav className="order-3 -mx-1 flex min-w-0 basis-full items-center gap-1 overflow-x-auto px-1 pb-1 sm:order-none sm:mx-0 sm:basis-auto sm:overflow-visible sm:pb-0">
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
          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={logout.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
