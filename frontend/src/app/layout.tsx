import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { MSWProvider } from "@/components/ui/MSWProvider";
import { QueryProvider } from "@/components/ui/QueryProvider";

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
        <MSWProvider>
          <QueryProvider>{children}</QueryProvider>
        </MSWProvider>
      </body>
    </html>
  );
}