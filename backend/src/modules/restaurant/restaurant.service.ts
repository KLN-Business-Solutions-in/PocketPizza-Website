import type { RestaurantSiteContent } from '@pokket-pizza/contract/contract';
import { NotFoundError } from '../../utils/errors';
import { findRestaurantSiteContent } from './restaurant.repository';
import {
  parseOpeningHours,
  parseSocialLinks,
  type RestaurantSiteRow,
} from './restaurant.types';

function serializeSiteContent(row: RestaurantSiteRow): RestaurantSiteContent {
  const openingHours = parseOpeningHours(row.openingHours);
  const socialLinks = parseSocialLinks(row.socialLinks);

  return {
    name: row.name,
    phone: row.phone,
    whatsappNumber: row.whatsappNumber,
    address: row.address,
    aboutText: row.aboutText,
    // An unset column and a set-but-empty one both mean "not published"; the
    // frontend renders its fallback for either rather than an empty section.
    openingHours: openingHours.length > 0 ? openingHours : null,
    socialLinks: socialLinks.length > 0 ? socialLinks : null,
    // Half a coordinate pair is unusable for a map embed, so require both.
    map:
      row.mapLat !== null && row.mapLng !== null
        ? { lat: row.mapLat, lng: row.mapLng }
        : null,
  };
}

export async function getSiteContent(): Promise<RestaurantSiteContent> {
  const row = await findRestaurantSiteContent();
  if (!row) throw new NotFoundError('Restaurant');
  return serializeSiteContent(row);
}