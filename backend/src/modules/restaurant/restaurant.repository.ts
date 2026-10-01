import { getPrisma } from '../../config/database';
import type { RestaurantSiteRow } from './restaurant.types';

// Explicit select rather than `findFirst()`: this is a public endpoint, so the
// column list is the allow-list that keeps deliveryFee and anything else
// non-public from ever reaching the response.
const siteContentSelect = {
  name: true,
  phone: true,
  whatsappNumber: true,
  address: true,
  aboutText: true,
  openingHours: true,
  socialLinks: true,
  mapLat: true,
  mapLng: true,
} as const;

export async function findRestaurantSiteContent(): Promise<RestaurantSiteRow | null> {
  const prisma = await getPrisma();
  return prisma.restaurant.findFirst({ select: siteContentSelect });
}