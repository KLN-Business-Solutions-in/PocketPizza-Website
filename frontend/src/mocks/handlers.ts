import { http, HttpResponse } from "msw";
import {
  MOCK_ADMIN_ORDER,
  MOCK_CATEGORIES,
  MOCK_CREATE_ORDER,
  MOCK_INVOICE,
  MOCK_ORDER,
  MOCK_PRODUCTS,
  MOCK_QUOTE,
} from "./fixtures";

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
const rid = () => crypto.randomUUID();

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

function priceQuote(lines: QuoteLine[], orderType: string) {
  const items = lines.map((l, idx) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === l.menuItemId);
    if (!product) throw { idx, reason: "not-found" };
    let unit = Number.parseFloat(product.basePrice);
    let variantLabel: string | null = null;
    if (l.variantId) {
      const v = product.variants.find((x) => x.id === l.variantId);
      if (!v) throw { idx, reason: "bad-variant" };
      unit += Number.parseFloat(v.priceDelta);
      variantLabel = v.label;
    }
    const addOnSnap: { label: string; price: string }[] = [];
    for (const aid of l.addOnIds ?? []) {
      const a = product.addOns.find((x) => x.id === aid);
      if (!a) throw { idx, reason: "bad-addon" };
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
      const err = e as { idx?: number };
      return fail(
        "ORDER_INVALID",
        "One or more cart items are no longer available.",
        400,
        [{ field: `items[${err?.idx ?? 0}]`, message: "Invalid item/variant/add-on." }]
      );
    }
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    const body = (await request.json()) as {
      orderType?: string;
      items?: QuoteLine[];
      customer?: { name?: string; phone?: string };
      address?: unknown;
    };
    if (!body.orderType || !body.items?.length) {
      return fail("VALIDATION_ERROR", "orderType and items are required.", 400);
    }
    if (!body.customer?.name || !body.customer?.phone) {
      return fail("VALIDATION_ERROR", "Customer name and phone are required.", 400);
    }
    if (body.orderType === "DELIVERY" && !body.address) {
      return fail("VALIDATION_ERROR", "Delivery address is required for DELIVERY orders.", 400);
    }
    try {
      const q = priceQuote(body.items, body.orderType);
      return ok(
        { ...MOCK_CREATE_ORDER, subtotal: q.subtotal, deliveryFee: q.deliveryFee, tax: q.tax, total: q.total },
        201
      );
    } catch {
      return fail("ORDER_INVALID", "One or more cart items are no longer available.", 400);
    }
  }),

  http.get(`${API}/orders/:publicToken/invoice`, () => ok(MOCK_INVOICE)),

  http.get(`${API}/orders/:publicToken`, ({ params }) => {
    if (params.publicToken === MOCK_ORDER.publicToken) return ok(MOCK_ORDER);
    return ok({ ...MOCK_ORDER, publicToken: String(params.publicToken) });
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
