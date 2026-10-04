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
    return <p className="p-6 text-body text-bodySecondary">Checking your sessionâ€¦</p>;
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
      <header className="sticky top-0 z-40 border-b border-border-default bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
              <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-2">
                <span className="font-heading font-extrabold text-xl text-brand-red">
                  Pokket Pizza
                </span>
                <span className="rounded bg-brand-red/10 px-2 py-0.5 text-xs font-bold text-brand-red">
                  Admin
                </span>
              </Link>
              <nav className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:pb-0">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-red/10 text-brand-red font-semibold"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:gap-4">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline-block">
                Logged in as <strong className="text-gray-800">Admin</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                isLoading={logout.isPending}
                className="text-xs"
              >
                Logout
              </Button>
            </div>
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
