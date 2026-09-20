import type {
  AdminOrderDetail,
  Category,
  CreateOrderResponse,
  InvoiceResponse,
  MenuItem,
  OrderStatusResponse,
  QuoteResponse,
} from "@shared/contract/contract";

/**
 * Canonical mock data — Backend Master Reference §7, §10, §11.
 * Money = decimal strings (INR). Categories nest items.
 * Statuses: NEW/CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY/COMPLETED/CANCELLED.
 */

const item1: MenuItem = {
  id: "prod-1",
  name: "Classic Margherita",
  description: "San Marzano tomato sauce, fresh mozzarella, and basil drizzle.",
  basePrice: "299.00",
  imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3",
  isVeg: true,
  variants: [
    { id: "v1-s", label: 'Small (8")', priceDelta: "0.00" },
    { id: "v1-m", label: 'Medium (12")', priceDelta: "100.00" },
    { id: "v1-l", label: 'Large (14")', priceDelta: "200.00" },
  ],
  addOns: [
    { id: "a1", label: "Extra Cheese", price: "40.00" },
    { id: "a2", label: "Garlic Crust Drizzle", price: "25.00" },
  ],
};

const item2: MenuItem = {
  id: "prod-2",
  name: "Fiery Pepperoni",
  description: "Double pepperoni, hot honey drizzle, crushed red pepper, mozzarella.",
  basePrice: "399.00",
  imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e",
  isVeg: false,
  variants: [
    { id: "v2-s", label: 'Small (8")', priceDelta: "0.00" },
    { id: "v2-m", label: 'Medium (12")', priceDelta: "120.00" },
  ],
  addOns: [{ id: "a1", label: "Extra Cheese", price: "40.00" }],
};

const item3: MenuItem = {
  id: "prod-6",
  name: "Garlic Butter Dough Balls",
  description: "Freshly baked dough balls with garlic butter dip.",
  basePrice: "129.00",
  imageUrl: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c",
  isVeg: true,
  variants: [],
  addOns: [],
};

const item4: MenuItem = {
  id: "prod-9",
  name: "Craft Mint Lemonade",
  description: "Freshly squeezed lemons infused with crushed mint leaves.",
  basePrice: "79.00",
  imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd",
  isVeg: true,
  variants: [],
  addOns: [],
};

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Pizzas", sortOrder: 1, items: [item1, item2] },
  { id: "cat-2", name: "Sides", sortOrder: 2, items: [item3] },
  { id: "cat-3", name: "Drinks", sortOrder: 3, items: [item4] },
];

export const MOCK_PRODUCTS: MenuItem[] = MOCK_CATEGORIES.flatMap((c) => c.items);

export const MOCK_PUBLIC_TOKEN = "ckmockpublictoken1";
export const MOCK_ORDER_NUMBER = "ORD-20260214-001";

export const MOCK_ORDER: OrderStatusResponse = {
  orderNumber: MOCK_ORDER_NUMBER,
  publicToken: MOCK_PUBLIC_TOKEN,
  status: "CONFIRMED",
  orderType: "DELIVERY",
  items: [
    {
      menuItemId: "prod-1",
      nameSnapshot: "Classic Margherita",
      variantSnapshot: 'Medium (12")',
      addOnSnapshot: [{ label: "Extra Cheese", price: "40.00" }],
      quantity: 1,
      unitPrice: "439.00",
      lineTotal: "439.00",
    },
  ],
  subtotal: "439.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "469.00",
  notes: null,
  createdAt: new Date().toISOString(),
};

export const MOCK_INVOICE: InvoiceResponse = {
  orderNumber: MOCK_ORDER_NUMBER,
  status: "CONFIRMED",
  orderType: "DELIVERY",
  customer: { name: "Anjali", phone: "9876543210" },
  address: {
    line1: "Flat 203",
    line2: "ABC Society",
    landmark: "Near Park",
    city: "Pune",
    pincode: "411001",
  },
  items: [
    {
      nameSnapshot: "Classic Margherita",
      variantSnapshot: 'Medium (12")',
      addOnSnapshot: [{ label: "Extra Cheese", price: "40.00" }],
      quantity: 1,
      unitPrice: "439.00",
      lineTotal: "439.00",
    },
  ],
  subtotal: "439.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "469.00",
  paymentMethod: "PAY_AT_STORE",
  createdAt: new Date().toISOString(),
};

export const MOCK_QUOTE: QuoteResponse = {
  items: MOCK_ORDER.items,
  subtotal: "439.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "469.00",
};

export const MOCK_CREATE_ORDER: CreateOrderResponse = {
  orderNumber: MOCK_ORDER_NUMBER,
  publicToken: MOCK_PUBLIC_TOKEN,
  status: "NEW",
  subtotal: "439.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "469.00",
};

export const MOCK_ADMIN_ORDER: AdminOrderDetail = {
  id: "order-id-1",
  orderNumber: MOCK_ORDER_NUMBER,
  customer: { name: "Anjali", phone: "9876543210" },
  orderType: "DELIVERY",
  status: "NEW",
  total: "469.00",
  createdAt: new Date().toISOString(),
  address: MOCK_INVOICE.address,
  notes: "Less spicy",
  items: MOCK_INVOICE.items,
  statusHistory: [],
  subtotal: "439.00",
  deliveryFee: "30.00",
  tax: "0.00",
};
