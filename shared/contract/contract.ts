//   Pokket Pizza | Frozen API Contract
//   Single source of truth for all request/response types and Zod schemas.
//   Both backend and frontend import from this file.
//   FROZEN: Any change requires standup announcement + both teams sign off.
//   Convention: All monetary values cross the wire as decimal strings ("399.00").


import { z } from 'zod';

// 1. ENUMS
export const OrderType = z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']);
export type OrderType = z.infer<typeof OrderType>;

export const OrderStatus = z.enum([
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

// 2. ERROR ENVELOPE
export type ErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
  requestId: string;
};

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  requestId: string;
};

// 3. SITE CONTENT (Public)
// Stored as Json columns on Restaurant and validated here, so a malformed row
// is rejected at the API boundary rather than leaking to the frontend.
export const openingHoursEntrySchema = z.object({
  label: z.string().min(1).max(50),
  opens: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'must be HH:MM 24-hour'),
  closes: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'must be HH:MM 24-hour'),
});
export type OpeningHoursEntry = z.infer<typeof openingHoursEntrySchema>;

export const socialLinkSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'x', 'whatsapp', 'website']),
  // url() alone accepts any scheme (javascript:, data:) and this value is rendered
  // into an href, so pin the protocol and require a parseable hostname.
  url: z
    .string()
    .url()
    .max(500)
    .refine(
      (value) => {
        try {
          const { protocol, hostname } = new URL(value);
          return (protocol === 'https:' || protocol === 'http:') && hostname.length > 0;
        } catch {
          return false;
        }
      },
      { message: 'must be an http(s) URL' },
    ),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

export type RestaurantSiteContent = {
  name: string;
  phone: string;
  whatsappNumber: string | null;
  address: string | null;
  aboutText: string | null;
  /** Null rather than a partial array: an unset row and an empty row are the
   *  same message to the frontend ("hours not published yet"). */
  openingHours: OpeningHoursEntry[] | null;
  socialLinks: SocialLink[] | null;
  /** Null unless both coordinates are set — a half-set pair is unusable. */
  map: { lat: number; lng: number } | null;
};

// 4. MENU (Public)
export type MenuItemAddon = {
  id: string;
  label: string;
  /** @decimal "40.00" */
  price: string;
};

export type MenuItemVariant = {
  id: string;
  label: string;
  /** @decimal "50.00" — added to basePrice */
  priceDelta: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  /** @decimal "299.00" */
  basePrice: string;
  imageUrl: string | null;
  isVeg: boolean;
  variants: MenuItemVariant[];
  addOns: MenuItemAddon[];
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

export type MenuResponse = {
  categories: Category[];
};

export type ProductDetailResponse = MenuItem;

// 5. ORDERS — Quote
export const quoteItemSchema = z.object({
  menuItemId: z.string().min(1),
  variantId: z.string().optional(),
  addOnIds: z
    .array(z.string())
    .max(20, 'at most 20 add-ons per item')
    .default([])
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "addOnIds must not contain duplicates",
    }),
  quantity: z.number().int().positive().max(99, 'must be between 1 and 99'),
});

export const quoteRequestSchema = z.object({
  orderType: OrderType,
  items: z.array(quoteItemSchema).min(1).max(50, 'at most 50 line items per order'),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export type QuoteItem = {
  menuItemId: string;
  nameSnapshot: string;
  variantSnapshot: string | null;
  addOnSnapshot: { label: string; price: string }[];
  quantity: number;
  /** @decimal "399.00" */
  unitPrice: string;
  /** @decimal "798.00" */
  lineTotal: string;
};

export type QuoteResponse = {
  items: QuoteItem[];
  /** @decimal "798.00" */
  subtotal: string;
  /** @decimal "30.00" */
  deliveryFee: string;
  /** @decimal "0.00" */
  tax: string;
  /** @decimal "828.00" */
  total: string;
};

// 6. ORDERS — Create
export const addressSchema = z.object({
  line1: z.string().trim().min(1).max(255),
  line2: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  city: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, 'must be a 6-digit Indian PIN code'),
});

export const indianPhoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s\-()]/g, ''))
  .refine((value) => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(value), {
    message: 'not a valid Indian mobile number',
  });

export const createOrderRequestSchema = z
  .object({
    orderType: OrderType,
    items: z.array(quoteItemSchema).min(1).max(50, 'at most 50 line items per order'),
    customer: z.object({
      name: z.string().trim().min(1).max(255),
      phone: indianPhoneSchema,
    }),
    address: addressSchema.optional(),
    notes: z.string().max(500).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.orderType === 'DELIVERY' && !value.address) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'required for DELIVERY orders' });
    }
  });

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export type CreateOrderResponse = {
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  tax: string;
  total: string;
};

// 7. ORDERS — Status & Invoice
export type OrderStatusResponse = {
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  orderType: OrderType;
  items: QuoteItem[];
  subtotal: string;
  deliveryFee: string;
  tax: string;
  total: string;
  notes: string | null;
  createdAt: string;
};

export type InvoiceItem = {
  menuItemId: string;
  nameSnapshot: string;
  variantSnapshot: string | null;
  addOnSnapshot: { label: string; price: string }[];
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type InvoiceResponse = {
  orderNumber: string;
  status: OrderStatus;
  orderType: OrderType;
  customer: {
    name: string;
    phone: string;
  };
  address: {
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    pincode: string;
  } | null;
  items: InvoiceItem[];
  subtotal: string;
  deliveryFee: string;
  tax: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
};

// 8. AUTH
export const loginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export type LoginResponse = {
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

// 9. ADMIN — Menu
export const createProductRequestSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1),
  basePrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
  imageUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => u.startsWith('https://'), { message: 'must be an https URL' })
    .optional(),
  isVeg: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        priceDelta: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
      }),
    )
    .optional(),
  addOns: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
      }),
    )
    .optional(),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

// .extend overrides isVeg: .partial() would keep the create-side default(true),
// making parse({}) inject { isVeg: true } into every PATCH.
export const updateProductRequestSchema = createProductRequestSchema
  .partial()
  .extend({ isVeg: z.boolean().optional() });
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

export type AdminMenuItem = MenuItem & {
  isActive: boolean;
  categoryId: string;
};

export type AdminMenuResponse = {
  categories: (Category & {
    items: AdminMenuItem[];
  })[];
};

export type ToggleStatusResponse = {
  id: string;
  isActive: boolean;
};

// 10. ADMIN — Orders
export const adminOrderListQuerySchema = z.object({
  status: OrderStatus.optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: OrderType.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export type AdminOrderSummary = {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  orderType: OrderType;
  status: OrderStatus;
  items: InvoiceItem[];
  /** @decimal "828.00" */
  total: string;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderSummary & {
  address: {
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    pincode: string;
  } | null;
  notes: string | null;
  items: InvoiceItem[];
  statusHistory: {
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
    changedBy: string;
    changedAt: string;
  }[];
  subtotal: string;
  deliveryFee: string;
  tax: string;
};

export const updateStatusRequestSchema = z.object({
  status: OrderStatus,
  reason: z.string().max(500).optional(),
});

export type UpdateStatusRequest = z.infer<typeof updateStatusRequestSchema>;

// 11. ADMIN — Reports
export const reportSummaryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ReportSummaryQuery = z.infer<typeof reportSummaryQuerySchema>;

export type ReportSummaryResponse = {
  orderCount: {
    total: number;
    completed: number;
    cancelled: number;
  };
  /** @decimal "15000.00" */
  salesTotal: string;
  /** @decimal "450.00" */
  averageOrderValue: string;
  topItems: {
    name: string;
    quantity: number;
    totalRevenue: string;
  }[];
};