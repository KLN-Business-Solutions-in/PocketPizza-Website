"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { RestaurantSiteContent } from "@shared/contract/contract";

/**
 * Public site content — GET /restaurant (name, phone, whatsappNumber,
 * opening hours, social links, map). Shared by About/Contact and the
 * WhatsApp action so the shop number is config, never a hardcoded literal.
 */
export function useSiteContent() {
  return useQuery<RestaurantSiteContent>({
    queryKey: ["site"],
    queryFn: () => apiFetch<RestaurantSiteContent>("/restaurant"),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
