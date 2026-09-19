import React from "react";
import Link from "next/link";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream-bg text-charcoal font-body">
      <header className="sticky top-0 z-40 bg-white border-b border-border-default shadow-card">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/menu" className="font-heading font-extrabold text-h2 text-brand-red">
            POKKET PIZZA
          </Link>
          <nav className="flex gap-6 text-button font-semibold">
            <Link href="/menu" className="hover:text-brand-red transition-colors">Menu</Link>
            <Link href="/cart" className="hover:text-brand-red transition-colors">Cart</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto p-4">{children}</main>
    </div>
  );
}