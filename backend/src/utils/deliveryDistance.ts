export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;
export const DELIVERY_RADIUS_KM = 1.5;
export const EXTRA_DELIVERY_FEE = 30; // ₹30

/**
 * Straight-line (great-circle) distance between two coordinates using the
 * Haversine formula. This is a geographic radius, not road distance — the
 * agreed rule is strictly coordinate-to-coordinate distance, no Maps API.
 */
export function calculateDistanceKm(
  shop: Coordinates,
  customer: Coordinates
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(shop.latitude);
  const lat2 = toRadians(customer.latitude);
  const deltaLat = toRadians(customer.latitude - shop.latitude);
  const deltaLon = toRadians(customer.longitude - shop.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  // Clamp for floating-point safety: the identity `a = sin²(Δφ/2) +
  // cosφ₁·cosφ₂·sin²(Δλ/2)` can drift a hair above 1 for antipodal-ish points,
  // which would make sqrt(1 - a) undefined (NaN).
  const boundedA = Math.min(1, Math.max(0, a));
  const centralAngle = 2 * Math.atan2(Math.sqrt(boundedA), Math.sqrt(1 - boundedA));

  return EARTH_RADIUS_KM * centralAngle;
}

/**
 * Free delivery within `DELIVERY_RADIUS_KM`; a flat `EXTRA_DELIVERY_FEE`
 * strictly beyond it. The comparison deliberately uses the *unrounded*
 * distance so a true 1.501 km is never rounded down into the free band.
 */
export function calculateDeliveryFee(
  shop: Coordinates,
  customer: Coordinates
): { distanceKm: number; deliveryFee: number } {
  const distanceKm = calculateDistanceKm(shop, customer);

  return {
    distanceKm,
    deliveryFee: distanceKm > DELIVERY_RADIUS_KM ? EXTRA_DELIVERY_FEE : 0,
  };
}

/**
 * Finite, in-range coordinates. The API boundary (Zod) and the boot-time env
 * schema already enforce this; this guard is defence-in-depth for values that
 * bypass those layers (e.g. parsed stored JSON or runtime env reads).
 */
export function isValidCoordinates(value: Coordinates): boolean {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}
