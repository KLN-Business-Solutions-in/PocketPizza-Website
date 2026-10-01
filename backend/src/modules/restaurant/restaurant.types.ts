import {
  openingHoursEntrySchema,
  socialLinkSchema,
  type OpeningHoursEntry,
  type SocialLink,
} from '@pokket-pizza/contract/contract';

/** A single Restaurant row, as Prisma returns it. */
export type RestaurantSiteRow = {
  name: string;
  phone: string;
  whatsappNumber: string | null;
  address: string | null;
  aboutText: string | null;
  openingHours: unknown;
  socialLinks: unknown;
  mapLat: number | null;
  mapLng: number | null;
};

// The JSON columns are untyped at the database level, so they are validated here
// and nowhere else. An invalid entry is dropped rather than failing the whole
// response: partially-bad editorial content must not 500 a public page.
//
// Structural rather than z.ZodType because the backend resolves zod v3 while
// the contract package's schemas are typed against v4; a ZodType annotation
// cannot span the two.

type SafeParser<T> = {
  safeParse: (value: unknown) => { success: boolean; data?: T };
};

function parseJsonArray<T>(value: unknown, schema: SafeParser<T>): T[] {
  if (!Array.isArray(value)) return [];
  const parsed: T[] = [];
  for (const entry of value) {
    const result = schema.safeParse(entry);
    if (result.success && result.data !== undefined) parsed.push(result.data);
  }
  return parsed;
}

export function parseOpeningHours(value: unknown): OpeningHoursEntry[] {
  return parseJsonArray(value, openingHoursEntrySchema);
}

export function parseSocialLinks(value: unknown): SocialLink[] {
  return parseJsonArray(value, socialLinkSchema);
}