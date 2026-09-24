import React from "react";
import Navbar from "@/components/layout/Navbar";
import { CartReconciler } from "@/components/cart/CartReconciler";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-bg font-body text-charcoal">
      <Navbar />
      <CartReconciler />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 md:px-10">{children}</main>
    </div>
  );
}