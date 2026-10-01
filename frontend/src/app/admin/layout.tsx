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
    { href: "/admin/menu-manager", label: "Menu Manager" },
  ];

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl text-brand-red">
                  Pokket Pizza
                </span>
                <span className="bg-brand-red/10 text-brand-red text-xs font-bold px-2 py-0.5 rounded">
                  Admin
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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

            <div className="flex items-center gap-4">
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
