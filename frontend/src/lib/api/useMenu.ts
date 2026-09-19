import { useQuery } from "@tanstack/react-query";
import { MenuResponseSchema } from "@shared/contracts";
import type { Product, Category } from "@shared/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

export interface MenuData {
  categories: Category[];
  products: Product[];
}

export function useMenu() {
  return useQuery<MenuData>({
    queryKey: ["menu"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/menu`);
      if (!res.ok) {
        throw new Error("Failed to load the menu. Please try again.");
      }
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error?.message || "Invalid response envelope");
      }

      // Validate against Day 1 contract
      const parsed = MenuResponseSchema.safeParse(json.data);
      if (!parsed.success) {
        throw new Error("Invalid menu data. Please try again.");
      }

      // Sort categories by displayOrder (non-mutating to keep query cache immutable)
      const categories = [...parsed.data.categories].sort((a, b) => a.displayOrder - b.displayOrder);

      return { categories, products: parsed.data.products };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}