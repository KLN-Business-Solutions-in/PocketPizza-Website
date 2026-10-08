"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSiteContent } from "@/lib/api/site";

/**
 * Floating tap-to-chat WhatsApp action (customer pages).
 *
 * - The number comes from restaurant config (GET /restaurant) — never a
 *   hardcoded literal; whatsappNumber falls back to the shop phone.
 * - Real anchor with target="_blank" rel="noopener noreferrer", built with
 *   encodeURIComponent — no JS click handler.
 * - Hidden on /checkout so it can never cover the checkout submit button at
 *   375px, and on /admin where it has no business.
 * - Bottom offset adds env(safe-area-inset-bottom) so it clears the iOS
 *   home indicator.
 */
function toWaDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  // Already an international number of some other length — pass through.
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export default function WhatsAppFab() {
  const pathname = usePathname() ?? "";
  const site = useSiteContent();

  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) return null;

  const number = toWaDigits(site.data?.whatsappNumber ?? site.data?.phone);
  if (!number) return null;

  const text = encodeURIComponent("Hi! I have a question about my order.");
  return (
    <a
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-status-whatsapp text-white shadow-elevated transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3C6.5 3 2 6.86 2 11.6c0 2.68 1.4 5.06 3.6 6.66l-.86 3.2c-.13.48.35.9.81.69l3.66-1.62c.9.24 1.87.37 2.79.37 5.5 0 10-3.86 10-8.7S17.5 3 12 3z"
        />
        <circle cx="8.4" cy="11.6" r="1.15" fill="#25D366" />
        <circle cx="12" cy="11.6" r="1.15" fill="#25D366" />
        <circle cx="15.6" cy="11.6" r="1.15" fill="#25D366" />
      </svg>
    </a>
  );
}
