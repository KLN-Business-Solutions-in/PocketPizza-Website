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
 *
 * Menu names, descriptions, base prices, variants, and add-ons mirror the
 * database seed in prisma/seed.ts (3 categories and 12 active items).
 * Image URLs are presentation-only mock assets; production URLs come from
 * Cloudinary through the API response.
 */

const sizeVariants = (prefix: string, mediumDelta: string, largeDelta: string) => [
  { id: `${prefix}-small`, label: "Small", priceDelta: "0.00" },
  { id: `${prefix}-medium`, label: "Medium", priceDelta: mediumDelta },
  { id: `${prefix}-large`, label: "Large", priceDelta: largeDelta },
];

const item1: MenuItem = {
  id: "prod-1",
  name: "Farmhouse Pizza",
  description: "Loaded with fresh vegetables and mozzarella cheese.",
  basePrice: "249.00",
  imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
  isVeg: true,
  variants: sizeVariants("v1", "80.00", "150.00"),
  addOns: [{ id: "a1-extra-cheese", label: "Extra Cheese", price: "40.00" }],
};

const item2: MenuItem = {
  id: "prod-2",
  name: "Margherita Pizza",
  description: "Classic tomato sauce topped with mozzarella cheese.",
  basePrice: "199.00",
  imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3",
  isVeg: true,
  variants: sizeVariants("v2", "70.00", "130.00"),
  addOns: [
    { id: "a2-extra-cheese", label: "Extra Cheese", price: "40.00" },
    { id: "a2-jalapenos", label: "Jalapenos", price: "30.00" },
  ],
};

const item3: MenuItem = {
  id: "prod-3",
  name: "Paneer Tikka Pizza",
  description: "Paneer tikka with onion, capsicum and mozzarella cheese.",
  basePrice: "279.00",
  imageUrl: "https://images.unsplash.com/photo-1579751626657-72bc17010498",
  isVeg: true,
  variants: sizeVariants("v3", "80.00", "150.00"),
  addOns: [
    { id: "a3-extra-cheese", label: "Extra Cheese", price: "40.00" },
    { id: "a3-extra-paneer", label: "Extra Paneer", price: "60.00" },
  ],
};

const item4: MenuItem = {
  id: "prod-4",
  name: "Veggie Supreme Pizza",
  description: "A loaded combination of vegetables, olives and cheese.",
  basePrice: "299.00",
  imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
  isVeg: true,
  variants: sizeVariants("v4", "90.00", "160.00"),
  addOns: [
    { id: "a4-extra-cheese", label: "Extra Cheese", price: "40.00" },
    { id: "a4-olives", label: "Olives", price: "30.00" },
  ],
};

const item5: MenuItem = {
  id: "prod-5",
  name: "Chicken Tikka Pizza",
  description: "Chicken tikka with onion and mozzarella cheese.",
  basePrice: "329.00",
  imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e",
  isVeg: false,
  variants: sizeVariants("v5", "90.00", "170.00"),
  addOns: [
    { id: "a5-extra-cheese", label: "Extra Cheese", price: "40.00" },
    { id: "a5-extra-chicken", label: "Extra Chicken", price: "70.00" },
  ],
};

const item6: MenuItem = {
  id: "prod-6",
  name: "Pepperoni Pizza",
  description: "Pepperoni with mozzarella cheese and pizza sauce.",
  basePrice: "349.00",
  imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
  isVeg: false,
  variants: sizeVariants("v6", "100.00", "180.00"),
  addOns: [
    { id: "a6-extra-cheese", label: "Extra Cheese", price: "40.00" },
    { id: "a6-extra-pepperoni", label: "Extra Pepperoni", price: "80.00" },
  ],
};

const item7: MenuItem = {
  id: "prod-7",
  name: "Garlic Bread",
  description: "Toasted garlic bread seasoned with herbs.",
  basePrice: "99.00",
  imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c",
  isVeg: true,
  variants: [],
  addOns: [{ id: "a7-cheese-dip", label: "Cheese Dip", price: "30.00" }],
};

const item8: MenuItem = {
  id: "prod-8",
  name: "Cheesy Garlic Bread",
  description: "Garlic bread topped with melted cheese.",
  basePrice: "139.00",
  imageUrl: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c",
  isVeg: true,
  variants: [],
  addOns: [{ id: "a8-extra-cheese", label: "Extra Cheese", price: "40.00" }],
};

const item9: MenuItem = {
  id: "prod-9",
  name: "Chicken Wings",
  description: "Seasoned chicken wings.",
  basePrice: "199.00",
  imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f",
  isVeg: false,
  variants: [],
  addOns: [],
};

const item10: MenuItem = {
  id: "prod-10",
  name: "Coca-Cola",
  description: "Chilled soft drink.",
  basePrice: "60.00",
  imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97",
  isVeg: true,
  variants: [],
  addOns: [],
};

const item11: MenuItem = {
  id: "prod-11",
  name: "Sprite",
  description: "Chilled lemon-lime soft drink.",
  basePrice: "60.00",
  imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7",
  isVeg: true,
  variants: [],
  addOns: [],
};

const item12: MenuItem = {
  id: "prod-12",
  name: "Mineral Water",
  description: "Packaged drinking water.",
  basePrice: "30.00",
  imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8",
  isVeg: true,
  variants: [],
  addOns: [],
};

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Pizzas", sortOrder: 1, items: [item1, item2, item3, item4, item5, item6] },
  { id: "cat-2", name: "Sides", sortOrder: 2, items: [item7, item8, item9] },
  { id: "cat-3", name: "Drinks", sortOrder: 3, items: [item10, item11, item12] },
];

export const MOCK_PRODUCTS: MenuItem[] = MOCK_CATEGORIES.flatMap((category) => category.items);

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
      nameSnapshot: "Farmhouse Pizza",
      variantSnapshot: "Medium",
      addOnSnapshot: [{ label: "Extra Cheese", price: "40.00" }],
      quantity: 1,
      unitPrice: "369.00",
      lineTotal: "369.00",
    },
  ],
  subtotal: "369.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "399.00",
  notes: null,
  createdAt: new Date().toISOString(),
};

export const MOCK_INVOICE: InvoiceResponse = {
  orderNumber: MOCK_ORDER_NUMBER,
  status: "CONFIRMED",
  orderType: "DELIVERY",
  customer: { name: "Anjali Sharma", phone: "9876543210" },
  address: {
    line1: "Flat 203",
    line2: "ABC Society",
    landmark: "Near Park",
    city: "Pune",
    pincode: "411001",
  },
  items: [
    {
      nameSnapshot: "Farmhouse Pizza",
      variantSnapshot: "Medium",
      addOnSnapshot: [{ label: "Extra Cheese", price: "40.00" }],
      quantity: 1,
      unitPrice: "369.00",
      lineTotal: "369.00",
    },
  ],
  subtotal: "369.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "399.00",
  paymentMethod: "PAY_AT_STORE",
  createdAt: new Date().toISOString(),
};

export const MOCK_QUOTE: QuoteResponse = {
  items: MOCK_ORDER.items,
  subtotal: "369.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "399.00",
};

export const MOCK_CREATE_ORDER: CreateOrderResponse = {
  orderNumber: MOCK_ORDER_NUMBER,
  publicToken: MOCK_PUBLIC_TOKEN,
  status: "NEW",
  subtotal: "369.00",
  deliveryFee: "30.00",
  tax: "0.00",
  total: "399.00",
};

export const MOCK_ADMIN_ORDER: AdminOrderDetail = {
  id: "order-id-1",
  orderNumber: MOCK_ORDER_NUMBER,
  customer: { name: "Anjali Sharma", phone: "9876543210" },
  orderType: "DELIVERY",
  status: "NEW",
  total: "399.00",
  createdAt: new Date().toISOString(),
  address: MOCK_INVOICE.address,
  notes: "Less spicy",
  items: MOCK_INVOICE.items,
  statusHistory: [],
  subtotal: "369.00",
  deliveryFee: "30.00",
  tax: "0.00",
};