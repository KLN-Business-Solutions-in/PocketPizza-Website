import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/ui/QueryProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { GlobalLoadingBar } from "@/components/ui/GlobalLoadingBar";

export const metadata: Metadata = {
  title: "Pokket Pizza",
  description: "Pocket-sized pizzas, full-sized flavour",
};

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-cream-bg font-body text-charcoal antialiased">
        <QueryProvider>
          <GlobalLoadingBar />
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}