import {
  createOrderRequestSchema,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type InvoiceResponse,
  type OrderStatusResponse,
  type QuoteResponse,
} from "@shared/contract/contract";

/**
 * Day 7 mock order store.
 *
 * Before this existed, `POST /orders` returned a fixed fixture and
 * `GET /orders/:publicToken` returned the same fixture for *every* token. That
 * made the sprint's own definition of done — place an order, land on a
 * confirmation, open its invoice — impossible to demonstrate: the order you
 * placed had no relationship to the page you were sent to, so a bug that
 * dropped the address, the notes or the item snapshots would never have shown
 * up in dev.
 *
 * Placed orders are held in a module-level Map keyed by publicToken, which is
 * exactly as durable as a service worker: a reload keeps them, a hard refresh
 * of the SW lifecycle does not. That is the right amount of state for a mock.
 */

export type PlacedOrder = {
  status: OrderStatusResponse;
  invoice: InvoiceResponse;
};

const placed = new Map<string, PlacedOrder>();

/** `MOCK_PUBLIC_TOKEN` is pre-seeded so the demo order page is still reachable. */
export function seedOrder(publicToken: string, order: PlacedOrder): void {
  placed.set(publicToken, order);
}

export function findOrder(publicToken: string | undefined): PlacedOrder | undefined {
  if (!publicToken) return undefined;
  return placed.get(publicToken);
}

/**
 * Contract validation, formatted the way the backend formats it.
 *
 * The real server runs the request through `createOrderRequestSchema` and its
 * error middleware renders each issue as `path.join(".")` + ": " + message
 * (backend/src/middleware/error.middleware.ts:40). Reproducing that exactly is
 * the point: it is the only way to exercise the `items.0.quantity` dialect that
 * the frontend's rejection parser has to understand, and running the *shared*
 * schema means the mock cannot drift from the limits the real API enforces.
 */
export function validateCreateOrder(
  body: unknown
): { ok: true; value: CreateOrderRequest } | { ok: false; details: string[] } {
  const parsed = createOrderRequestSchema.safeParse(body);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

let sequence = 1;

/**
 * 48 hex chars, matching the backend's `randomBytes(24).toString("hex")` and
 * satisfying the `/^[0-9a-z]{21,64}$/` route guard in order.validation.ts:12.
 *
 * Note the pre-existing `MOCK_PUBLIC_TOKEN` fixture is only 17 chars and would
 * be rejected by that guard — it survives as a demo token but is not a model of
 * a real one.
 */
function mintPublicToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function mintOrderNumber(): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  sequence += 1;
  return `ORD-${stamp}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Turn a validated request plus its priced quote into the two responses the
 * customer will actually be shown, and remember them.
 *
 * `CreateOrderResponse` is a thin acknowledgement — it carries no items, no
 * customer and no address — which is precisely why the confirmation screen has
 * to re-fetch by publicToken, and why it currently cannot show the delivery
 * address without a second request. See DAYS-6-7-REMAINING.md 7.R3.
 */
export function placeOrder(request: CreateOrderRequest, priced: QuoteResponse): {
  created: CreateOrderResponse;
  stored: PlacedOrder;
} {
  const publicToken = mintPublicToken();
  const orderNumber = mintOrderNumber();
  const createdAt = new Date().toISOString();
  const address = request.address ?? null;

  const status: OrderStatusResponse = {
    orderNumber,
    publicToken,
    status: "NEW",
    orderType: request.orderType,
    items: priced.items,
    subtotal: priced.subtotal,
    deliveryFee: priced.deliveryFee,
    tax: priced.tax,
    total: priced.total,
    notes: request.notes ?? null,
    createdAt,
  };

  const invoice: InvoiceResponse = {
    orderNumber,
    status: "NEW",
    orderType: request.orderType,
    customer: { name: request.customer.name, phone: request.customer.phone },
    // A PICKUP / DINE_IN order has no address, and the contract types it as
    // nullable for exactly that reason. Mirroring it is what lets the frontend
    // condition the address block on orderType.
    address: address
      ? {
          line1: address.line1,
          line2: address.line2 ?? null,
          landmark: address.landmark ?? null,
          city: address.city,
          pincode: address.pincode,
        }
      : null,
    items: priced.items,
    subtotal: priced.subtotal,
    deliveryFee: priced.deliveryFee,
    tax: priced.tax,
    total: priced.total,
    paymentMethod: "PAY_AT_STORE",
    createdAt,
  };

  const stored: PlacedOrder = { status, invoice };
  placed.set(publicToken, stored);

  return {
    created: {
      orderNumber,
      publicToken,
      status: "NEW",
      subtotal: priced.subtotal,
      deliveryFee: priced.deliveryFee,
      tax: priced.tax,
      total: priced.total,
    },
    stored,
  };
}

/** Test hook: forget everything. */
export function resetOrders(): void {
  placed.clear();
  sequence = 1;
}
