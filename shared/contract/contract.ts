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

// 3. MENU (Public)
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

// Runtime schemas for the public menu endpoints. The TypeScript types above
// remain the source of truth; these schemas make contract drift visible at the
// API boundary instead of allowing malformed data to reach UI components.
const decimalStringSchema = z.string().regex(/^\d+(\.\d{1,2})?$/);

export const ErrorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.array(z.string()).optional(),
      })
      .strict(),
    requestId: z.string().min(1),
  })
  .strict();

export const SuccessEnvelopeSchema = z
  .object({
    success: z.literal(true),
    data: z.unknown(),
    requestId: z.string().min(1),
  })
  .strict();

export const MenuItemAddonSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    price: decimalStringSchema,
  })
  .strict();

export const MenuItemVariantSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    priceDelta: decimalStringSchema,
  })
  .strict();

export const MenuItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable(),
    basePrice: decimalStringSchema,
    imageUrl: z.string().url().nullable(),
    isVeg: z.boolean(),
    variants: z.array(MenuItemVariantSchema),
    addOns: z.array(MenuItemAddonSchema),
  })
  .strict();

export const CategorySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    sortOrder: z.number().int(),
    items: z.array(MenuItemSchema),
  })
  .strict();

export const MenuResponseSchema = z
  .object({
    categories: z.array(CategorySchema),
  })
  .strict();

export const ProductDetailResponseSchema = MenuItemSchema;

// 4. ORDERS — Quote
export const quoteItemSchema = z.object({
  menuItemId: z.string().min(1),
  variantId: z.string().optional(),
  addOnIds: z.array(z.string()).default([]),
  quantity: z.number().int().positive(),
});

export const quoteRequestSchema = z.object({
  orderType: OrderType,
  items: z.array(quoteItemSchema).min(1),
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

// 5. ORDERS — Create
export const addressSchema = z.object({
  line1: z.string().trim().min(1, "Address line 1 is required.").max(255),
  line2: z.string().trim().max(255).optional(),
  landmark: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1, "City is required for delivery.").max(100),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode."),
});

export const createOrderRequestSchema = z
  .object({
    orderType: OrderType,
    items: z.array(quoteItemSchema).min(1),
    customer: z.object({
      name: z.string().trim().min(1, "Name is required.").max(255),
      phone: z
        .string()
        .trim()
        .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
    }),
    address: addressSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.orderType !== "DELIVERY") return;

    if (!value.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address"],
        message: "Delivery address is required.",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address", "line1"],
        message: "Address line 1 is required for delivery.",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address", "city"],
        message: "City is required for delivery.",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address", "pincode"],
        message: "Pincode is required for delivery.",
      });
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

// 6. ORDERS — Status & Invoice
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

// 7. AUTH
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

// 8. ADMIN — Menu
export const createProductRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  categoryId: z.string().min(1),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  imageUrl: z.string().url().optional(),
  isVeg: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        priceDelta: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }),
    )
    .optional(),
  addOns: z
    .array(
      z.object({
        label: z.string().min(1).max(100),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }),
    )
    .optional(),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

export const updateProductRequestSchema = createProductRequestSchema.partial();
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

// 9. ADMIN — Orders
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

// 10. ADMIN — Reports
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