import React from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import WhatsAppFab from "@/components/layout/WhatsAppFab";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    // overflow-x-clip (not hidden): lets the hero banners full-bleed past the
    // centered max-w-6xl <main> without a horizontal scrollbar, while keeping
    // position: sticky (menu filter bar) working.
    <div className="flex min-h-screen flex-col overflow-x-clip bg-cream-bg font-body text-charcoal">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 md:px-10">{children}</main>
      <WhatsAppFab />
      <Footer />
    </div>
  );
}
