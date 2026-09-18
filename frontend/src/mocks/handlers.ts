import { http, HttpResponse } from "msw";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_ORDERS } from "./fixtures";

// Wildcard origin so the browser worker intercepts the request no matter
// which host/port the app or API base URL uses (e.g. localhost:3000 page
// fetching from localhost:4000). Matches the Pokket Pizza schema:
// GET /api/v1/menu -> { success, data: { categories, products }, requestId }
const API = "*/api/v1";

export const handlers = [
  // Get Menu
  http.get(`${API}/menu`, () => {
    return HttpResponse.json({
      success: true,
      data: { categories: MOCK_CATEGORIES, products: MOCK_PRODUCTS },
      requestId: crypto.randomUUID(),
    });
  }),

  // Get Product Detail
  http.get(`${API}/products/:id`, ({ params }) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Product not found", details: [] },
          requestId: crypto.randomUUID(),
        },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: product, requestId: crypto.randomUUID() });
  }),

  // Calculate Quote
  http.post(`${API}/quote`, async ({ request }) => {
    const body = (await request.json()) as { items?: unknown[] };
    const subtotal = 1299 * (body.items?.length || 1);
    const tax = Math.round(subtotal * 0.1);
    const deliveryFee = 250;
    return HttpResponse.json({
      success: true,
      data: { subtotal, tax, discount: 0, deliveryFee, total: subtotal + tax + deliveryFee, breakdown: [] },
      requestId: crypto.randomUUID(),
    });
  }),

  // Create Order
  http.post(`${API}/orders`, async ({ request }) => {
    const body = (await request.json()) as {
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
    };
    const createdOrder = {
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "PENDING",
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      deliveryAddress: body.deliveryAddress,
      subtotal: 1599,
      tax: 160,
      deliveryFee: 250,
      total: 2009,
      createdAt: new Date().toISOString(),
      items: [],
    };
    return HttpResponse.json({ success: true, data: createdOrder, requestId: crypto.randomUUID() }, { status: 201 });
  }),

  // Order Lookup
  http.get(`${API}/orders/:orderNumber`, ({ params }) => {
    const order = MOCK_ORDERS.find((o) => o.orderNumber === params.orderNumber) || MOCK_ORDERS[0];
    return HttpResponse.json({ success: true, data: order, requestId: crypto.randomUUID() });
  }),

  // Admin Login
  http.post(`${API}/admin/login`, () => {
    return HttpResponse.json({
      success: true,
      data: { token: "mock-admin-token", admin: { id: "a1", email: "admin@pokketpizza.com", name: "Pokket Admin" } },
      requestId: crypto.randomUUID(),
    });
  }),
];