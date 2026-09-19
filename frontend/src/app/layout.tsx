import type { Metadata } from "next";
import "./globals.css";
import { MSWProvider } from "@/components/ui/MSWProvider";
import { QueryProvider } from "@/components/ui/QueryProvider";

export const metadata: Metadata = {
  title: "Pokket Pizza",
  description: "Pocket-sized pizzas, full-sized flavour",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MSWProvider>
          <QueryProvider>{children}</QueryProvider>
        </MSWProvider>
      </body>
    </html>
  );
}