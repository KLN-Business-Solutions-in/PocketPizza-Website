import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DELIVERY_RADIUS_KM,
  EXTRA_DELIVERY_FEE,
  calculateDeliveryFee,
  calculateDistanceKm,
  isValidCoordinates,
  type Coordinates,
} from './deliveryDistance';

// With R = 6371 km, one degree of latitude is exactly (π/180)·6371 km. Offsets
// are built from this constant so the test distances are the real ones.
const KM_PER_DEGREE_LAT = (Math.PI / 180) * 6371;

// A degree of longitude shrinks with latitude — needed for east-west offsets.
const KM_PER_DEGREE_LON_AT_SHOP =
  KM_PER_DEGREE_LAT * Math.cos((18.456165955627945 * Math.PI) / 180);

const SHOP: Coordinates = { latitude: 18.456165955627945, longitude: 73.86959266088635 };

function northOf(shop: Coordinates, km: number): Coordinates {
  return { latitude: shop.latitude + km / KM_PER_DEGREE_LAT, longitude: shop.longitude };
}

test('same point is 0 km and free', () => {
  const { distanceKm, deliveryFee } = calculateDeliveryFee(SHOP, SHOP);
  assert.equal(distanceKm, 0);
  assert.equal(deliveryFee, 0);
});

test('0.8 km is under the radius and free', () => {
  const { distanceKm, deliveryFee } = calculateDeliveryFee(SHOP, northOf(SHOP, 0.8));
  assert.ok(Math.abs(distanceKm - 0.8) < 1e-9, `expected ~0.8 km, got ${distanceKm}`);
  assert.equal(deliveryFee, 0);
});

test('just inside 1.5 km is free', () => {
  const { deliveryFee } = calculateDeliveryFee(SHOP, northOf(SHOP, DELIVERY_RADIUS_KM - 1e-9));
  assert.equal(deliveryFee, 0);
});

test('just beyond 1.5 km costs the extra fee', () => {
  const { deliveryFee } = calculateDeliveryFee(SHOP, northOf(SHOP, DELIVERY_RADIUS_KM + 1e-9));
  assert.equal(deliveryFee, EXTRA_DELIVERY_FEE);
});

test('diagonal ~√2 km is still inside the radius and free', () => {
  const customer: Coordinates = {
    latitude: SHOP.latitude + 1 / KM_PER_DEGREE_LAT,
    longitude: SHOP.longitude + 1 / KM_PER_DEGREE_LON_AT_SHOP,
  };
  const { distanceKm, deliveryFee } = calculateDeliveryFee(SHOP, customer);
  assert.ok(
    Math.abs(distanceKm - Math.SQRT2) < 1e-3,
    `expected ~${Math.SQRT2} km, got ${distanceKm}`,
  );
  assert.equal(deliveryFee, 0);
});

test('1.51 km costs the extra fee', () => {
  const { distanceKm, deliveryFee } = calculateDeliveryFee(SHOP, northOf(SHOP, 1.51));
  assert.ok(Math.abs(distanceKm - 1.51) < 1e-9, `expected ~1.51 km, got ${distanceKm}`);
  assert.equal(deliveryFee, EXTRA_DELIVERY_FEE);
});

test('2 km costs the extra fee', () => {
  const { distanceKm, deliveryFee } = calculateDeliveryFee(SHOP, northOf(SHOP, 2));
  assert.ok(Math.abs(distanceKm - 2) < 1e-9, `expected ~2 km, got ${distanceKm}`);
  assert.equal(deliveryFee, EXTRA_DELIVERY_FEE);
});

test('5 km costs the extra fee', () => {
  const { deliveryFee } = calculateDeliveryFee(SHOP, northOf(SHOP, 5));
  assert.equal(deliveryFee, EXTRA_DELIVERY_FEE);
});

test('distance is symmetric', () => {
  const customer = northOf(SHOP, 3.2);
  assert.equal(calculateDistanceKm(SHOP, customer), calculateDistanceKm(customer, SHOP));
});

test('antipodal-ish inputs stay finite (clamping)', () => {
  const distance = calculateDistanceKm(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 180 }
  );
  assert.ok(Number.isFinite(distance));
  assert.ok(Math.abs(distance - 20015.0868) < 0.001, `got ${distance}`);
});

test('isValidCoordinates accepts in-range points and the exact bounds', () => {
  assert.equal(isValidCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(isValidCoordinates({ latitude: 90, longitude: 180 }), true);
  assert.equal(isValidCoordinates({ latitude: -90, longitude: -180 }), true);
});

test('isValidCoordinates rejects out-of-range, NaN and Infinity', () => {
  assert.equal(isValidCoordinates({ latitude: 90.1, longitude: 0 }), false);
  assert.equal(isValidCoordinates({ latitude: 0, longitude: -180.5 }), false);
  assert.equal(isValidCoordinates({ latitude: NaN, longitude: 0 }), false);
  assert.equal(isValidCoordinates({ latitude: 0, longitude: Infinity }), false);
});
