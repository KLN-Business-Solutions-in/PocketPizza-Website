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

export const MOCK_ADMIN_ORDERS: AdminOrderDetail[] = [
  {
    id: "order-1",
    orderNumber: "ORD-20260927-001",
    customer: { name: "Aarav Sharma", phone: "9876543210" },
    orderType: "DELIVERY",
    status: "NEW",
    total: "469.00",
    subtotal: "439.00",
    deliveryFee: "30.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: MOCK_INVOICE.address,
    notes: "Less spicy, extra napkins please",
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
    statusHistory: [],
  },
  {
    id: "order-2",
    orderNumber: "ORD-20260927-002",
    customer: { name: "Priya Patel", phone: "9812345678" },
    orderType: "PICKUP",
    status: "CONFIRMED",
    total: "399.00",
    subtotal: "399.00",
    deliveryFee: "0.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: null,
    notes: "Pack carefully",
    items: [
      {
        menuItemId: "prod-2",
        nameSnapshot: "Fiery Pepperoni",
        variantSnapshot: 'Small (8")',
        addOnSnapshot: [],
        quantity: 1,
        unitPrice: "399.00",
        lineTotal: "399.00",
      },
    ],
    statusHistory: [],
  },
  {
    id: "order-3",
    orderNumber: "ORD-20260927-003",
    customer: { name: "Rohan Gupta", phone: "9765432109" },
    orderType: "DINE_IN",
    status: "PREPARING",
    total: "528.00",
    subtotal: "528.00",
    deliveryFee: "0.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: null,
    notes: "Table 4",
    items: [
      {
        menuItemId: "prod-2",
        nameSnapshot: "Fiery Pepperoni",
        variantSnapshot: 'Medium (12")',
        addOnSnapshot: [],
        quantity: 1,
        unitPrice: "528.00",
        lineTotal: "528.00",
      },
    ],
    statusHistory: [],
  },
  {
    id: "order-4",
    orderNumber: "ORD-20260927-004",
    customer: { name: "Ananya Iyer", phone: "9654321098" },
    orderType: "DELIVERY",
    status: "READY",
    total: "757.00",
    subtotal: "727.00",
    deliveryFee: "30.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: MOCK_INVOICE.address,
    notes: "Ring doorbell twice",
    items: [
      {
        menuItemId: "prod-1",
        nameSnapshot: "Classic Margherita",
        variantSnapshot: 'Large (14")',
        addOnSnapshot: [],
        quantity: 1,
        unitPrice: "499.00",
        lineTotal: "499.00",
      },
      {
        menuItemId: "prod-6",
        nameSnapshot: "Garlic Butter Dough Balls",
        variantSnapshot: null,
        addOnSnapshot: [],
        quantity: 2,
        unitPrice: "114.00",
        lineTotal: "228.00",
      },
    ],
    statusHistory: [],
  },
  {
    id: "order-5",
    orderNumber: "ORD-20260927-005",
    customer: { name: "Vikram Singh", phone: "9543210987" },
    orderType: "DELIVERY",
    status: "OUT_FOR_DELIVERY",
    total: "429.00",
    subtotal: "399.00",
    deliveryFee: "30.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: MOCK_INVOICE.address,
    notes: "Call on arrival",
    items: [
      {
        menuItemId: "prod-1",
        nameSnapshot: "Classic Margherita",
        variantSnapshot: 'Medium (12")',
        addOnSnapshot: [],
        quantity: 1,
        unitPrice: "399.00",
        lineTotal: "399.00",
      },
    ],
    statusHistory: [],
  },
  {
    id: "order-6",
    orderNumber: "ORD-20260927-006",
    customer: { name: "Neha Deshmukh", phone: "9432109876" },
    orderType: "PICKUP",
    status: "COMPLETED",
    total: "299.00",
    subtotal: "299.00",
    deliveryFee: "0.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: null,
    notes: null,
    items: [
      {
        menuItemId: "prod-1",
        nameSnapshot: "Classic Margherita",
        variantSnapshot: 'Small (8")',
        addOnSnapshot: [],
        quantity: 1,
        unitPrice: "299.00",
        lineTotal: "299.00",
      },
    ],
    statusHistory: [],
  },
  {
    id: "order-7",
    orderNumber: "ORD-20260927-007",
    customer: { name: "Kabir Mehta", phone: "9321098765" },
    orderType: "DELIVERY",
    status: "CANCELLED",
    total: "429.00",
    subtotal: "399.00",
    deliveryFee: "30.00",
    tax: "0.00",
    createdAt: new Date().toISOString(),
    address: MOCK_INVOICE.address,
    notes: "Customer cancelled",
    items: [
      {
        menuItemId: "prod-2",
        nameSnapshot: "Fiery Pepperoni",
        variantSnapshot: 'Small (8")',
        addOnSnapshot: [],
        quantity: 1,
        unitPrice: "399.00",
        lineTotal: "399.00",
      },
    ],
    statusHistory: [],
  },
];

export const MOCK_ADMIN_ORDER: AdminOrderDetail = MOCK_ADMIN_ORDERS[0];

