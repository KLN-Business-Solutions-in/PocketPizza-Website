import { http, HttpResponse } from "msw";
import {
  MOCK_ADMIN_ORDER,
  MOCK_CATEGORIES,
  MOCK_INVOICE,
  MOCK_ORDER,
  MOCK_PRODUCTS,
  MOCK_QUOTE,
} from "./fixtures";
import { findOrder, placeOrder, seedOrder, validateCreateOrder } from "./orderStore";

/**
 * MSW handlers mirror Backend Master Reference §15 endpoint reference.
 * Envelope: { success, data, requestId } / { success:false, error, requestId }.
 *
 * Public:  GET /menu, GET /products/:id,
 *          POST /orders/quote, POST /orders,
 *          GET /orders/:publicToken, GET /orders/:publicToken/invoice
 * Auth:    POST /auth/login, POST /auth/refresh, POST /auth/logout (cookies)
 * Admin:   /admin/orders, /admin/menu, /admin/products, /admin/reports/summary
 */

const API = "*/api/v1";

/** Service Workers don't always expose crypto.randomUUID — use a safe fallback. */
const rid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function ok(data: unknown, status = 200) {
  return HttpResponse.json({ success: true, data, requestId: rid() }, { status });
}

function fail(code: string, message: string, status: number, details: unknown[] = []) {
  return HttpResponse.json(
    { success: false, error: { code, message, details }, requestId: rid() },
    { status }
  );
}

type QuoteLine = { menuItemId: string; variantId?: string; addOnIds?: string[]; quantity: number };

/** Thrown by priceQuote; `reason` is already in the backend's wire format. */
class QuoteRejection extends Error {
  constructor(readonly index: number, readonly reason: string) {
    super(reason);
    this.name = "QuoteRejection";
  }
}

function priceQuote(lines: QuoteLine[], orderType: string) {
  const items = lines.map((l, idx) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === l.menuItemId);
    if (!product) {
      throw new QuoteRejection(idx, `items[${idx}]: "menuItemId" not found`);
    }
    let unit = Number.parseFloat(product.basePrice);
    let variantLabel: string | null = null;
    if (l.variantId) {
      const v = product.variants.find((x) => x.id === l.variantId);
      if (!v) {
        throw new QuoteRejection(
          idx,
          `items[${idx}]: invalid variant for "${product.name}"`
        );
      }
      unit += Number.parseFloat(v.priceDelta);
      variantLabel = v.label;
    }
    const addOnSnap: { label: string; price: string }[] = [];
    for (const aid of l.addOnIds ?? []) {
      const a = product.addOns.find((x) => x.id === aid);
      if (!a) {
        throw new QuoteRejection(
          idx,
          `items[${idx}]: invalid add-on "${aid}" for "${product.name}"`
        );
      }
      unit += Number.parseFloat(a.price);
      addOnSnap.push({ label: a.label, price: a.price });
    }
    const lineTotal = unit * l.quantity;
    return {
      menuItemId: product.id,
      nameSnapshot: product.name,
      variantSnapshot: variantLabel,
      addOnSnapshot: addOnSnap,
      quantity: l.quantity,
      unitPrice: unit.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
    };
  });
  const subtotal = items.reduce((n, i) => n + Number.parseFloat(i.lineTotal), 0);
  const deliveryFee = orderType === "DELIVERY" ? 30 : 0;
  const total = subtotal + deliveryFee;
  return {
    items,
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    tax: "0.00",
    total: total.toFixed(2),
  };
}

export const handlers = [
  // ---- Public menu ----
  http.get(`${API}/menu`, () => ok({ categories: MOCK_CATEGORIES })),

  http.get(`${API}/products/:id`, ({ params }) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === params.id);
    if (!product) return fail("NOT_FOUND", "Product not found.", 404);
    return ok(product);
  }),

  // ---- Quote + create ----
  http.post(`${API}/orders/quote`, async ({ request }) => {
    const body = (await request.json()) as { orderType?: string; items?: QuoteLine[] };
    if (!body.orderType || !Array.isArray(body.items) || body.items.length === 0) {
      return fail("VALIDATION_ERROR", "orderType and at least one item are required.", 400);
    }
    try {
      return ok(priceQuote(body.items, body.orderType));
    } catch (e: unknown) {
      // Mirrors the backend exactly: code VALIDATION_ERROR, details a string[]
      // of `items[N]: ...` per offending line, whole quote rejected. The
      // frontend maps `items[N]` back onto the offending cart line.
      if (e instanceof QuoteRejection) {
        return fail("VALIDATION_ERROR", "Quote rejected", 400, [e.reason]);
      }
      return fail("VALIDATION_ERROR", "Quote rejected", 400);
    }
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    const body: unknown = await request.json();
    // Day 6/7: validate against the shared contract, exactly as the backend
    // does, so the frontend's rejection parser is exercised against real Zod
    // issue paths (`items.0.quantity: …`) rather than only the hand-written
    // `items[0]: …` dialect the pricing pass emits.
    const validated = validateCreateOrder(body);
    if (!validated.ok) {
      return fail("VALIDATION_ERROR", "Validation failed", 400, validated.details);
    }
    const parsed = validated.value;
    try {
      const q = priceQuote(parsed.items, parsed.orderType);
      return ok(placeOrder(parsed, q).created, 201);
    } catch (e: unknown) {
      const details = e instanceof QuoteRejection ? [e.reason] : [];
      return fail("VALIDATION_ERROR", "Order rejected", 400, details);
    }
  }),

  http.get(`${API}/orders/:publicToken/invoice`, ({ params }) => {
    const token = String(params.publicToken);
    // A real order placed in this session wins, so opening the invoice for the
    // order you just placed shows YOUR order.
    const found = findOrder(token);
    if (found) return ok(found.invoice);
    // Only the seeded demo token falls back to the fixture. Any other unknown
    // token is a 404, not a silent echo of someone else's order.
    if (token === MOCK_ORDER.publicToken) return ok(MOCK_INVOICE);
    return fail("NOT_FOUND", "Invoice not found.", 404);
  }),

  http.get(`${API}/orders/:publicToken`, ({ params }) => {
    const token = String(params.publicToken);
    const found = findOrder(token);
    if (found) return ok(found.status);
    if (token === MOCK_ORDER.publicToken) return ok(MOCK_ORDER);
    return fail("NOT_FOUND", "Order not found.", 404);
  }),

  // ---- Auth (cookie-based, no token in body) ----
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === "admin@pokketpizza.com" && (body.password || "").length >= 8) {
      return ok({
        admin: { id: "a1", name: "Pokket Admin", email: "admin@pokketpizza.com", role: "OWNER" },
      });
    }
    return fail("AUTHENTICATION_INVALID", "Invalid email or password.", 401);
  }),

  http.post(`${API}/auth/refresh`, () => ok({ admin: { id: "a1", name: "Pokket Admin", email: "admin@pokketpizza.com", role: "OWNER" } })),
  http.post(`${API}/auth/logout`, () => ok({})),

  // ---- Admin orders ----
  http.get(`${API}/admin/orders`, () => ok([MOCK_ADMIN_ORDER])),
  http.get(`${API}/admin/orders/:id`, () => ok(MOCK_ADMIN_ORDER)),
  http.patch(`${API}/admin/orders/:id/status`, async ({ request }) => {
    const body = (await request.json()) as { status?: string };
    const allowed = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];
    if (!body.status || !allowed.includes(body.status)) {
      return fail("ORDER_INVALID_TRANSITION", "Invalid status transition.", 400);
    }
    return ok({ ...MOCK_ADMIN_ORDER, status: body.status });
  }),

  // ---- Admin menu (soft toggle only, no DELETE) ----
  http.get(`${API}/admin/menu`, () =>
    ok({
      categories: MOCK_CATEGORIES.map((c) => ({
        ...c,
        items: c.items.map((i) => ({ ...i, isActive: true, categoryId: c.id })),
      })),
    })
  ),
  http.post(`${API}/admin/products`, () => ok(MOCK_PRODUCTS[0], 201)),
  http.patch(`${API}/admin/products/:id`, () => ok(MOCK_PRODUCTS[0])),
  http.patch(`${API}/admin/products/:id/status`, () =>
    ok({ id: "prod-1", isActive: true })
  ),

  // ---- Admin reports ----
  http.get(`${API}/admin/reports/summary`, () =>
    ok({
      orderCount: { total: 10, completed: 8, cancelled: 1 },
      salesTotal: "4500.00",
      averageOrderValue: "562.50",
      topItems: [{ name: "Classic Margherita", quantity: 12, totalRevenue: "3588.00" }],
    })
  ),

  // Silence unused-var lint for the static quote fixture (kept for reference).
  http.get(`${API}/__quote-fixture`, () => ok(MOCK_QUOTE)),
];

// The demo order page is linked from the home page, so it needs an order to
// exist before anyone has checked out. Everything placed during the session is
// layered on top of this one.
seedOrder(MOCK_ORDER.publicToken, { status: MOCK_ORDER, invoice: MOCK_INVOICE });
