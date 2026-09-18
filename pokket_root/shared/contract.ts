// Zod is supplied by the application dependencies at runtime. Keep this
// contract usable by TypeScript tooling when those optional dependencies are
// not installed in the current workspace.
// @ts-ignore -- module resolution is provided by the consuming application.
import { z } from "zod";

// ==========================================
// Base & Error Envelope Schemas
// ==========================================

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

export const ApiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ApiErrorDetailSchema).default([]),
  }),
  requestId: z.string(),
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  requestId: string;
}

// ==========================================
// Domain Entities & Models
// ==========================================

export const DietaryTypeSchema = z.enum(["VEG", "NON_VEG", "EGG"]);
export type DietaryType = z.infer<typeof DietaryTypeSchema>;

export const VariantSchema = z.object({
  id: z.string(),
  name: z.string(), // e.g., "Small", "Medium", "Large"
  priceOffset: z.number(), // Offset in cents/lowest currency unit relative to base
});

export const AddOnSchema = z.object({
  id: z.string(),
  name: z.string(), // e.g., "Extra Cheese"
  price: z.number(),
});

export const ProductSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string(),
  basePrice: z.number(),
  dietaryType: DietaryTypeSchema,
  imageUrl: z.string().url(),
  isAvailable: z.boolean(),
  variants: z.array(VariantSchema),
  addOns: z.array(AddOnSchema),
});

export type Product = z.infer<typeof ProductSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  displayOrder: z.number(),
});

export type Category = z.infer<typeof CategorySchema>;

// ==========================================
// Customer Workflows (Menu, Cart, Orders)
// ==========================================

export const MenuResponseSchema = z.object({
  categories: z.array(CategorySchema),
  products: z.array(ProductSchema),
});

export const QuoteItemRequestSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  selectedAddOnIds: z.array(z.string()).default([]),
  quantity: z.number().int().positive(),
});

export const QuoteRequestSchema = z.object({
  items: z.array(QuoteItemRequestSchema),
  couponCode: z.string().optional(),
});

export const QuoteResponseSchema = z.object({
  subtotal: z.number(),
  tax: z.number(),
  discount: z.number(),
  deliveryFee: z.number(),
  total: z.number(),
  breakdown: z.array(
    z.object({
      productId: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
    })
  ),
});

export const OrderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export const CreateOrderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(10),
  deliveryAddress: z.string().min(5),
  items: z.array(QuoteItemRequestSchema),
  paymentMethod: z.enum(["CARD", "UPI", "CASH"]),
});

export const OrderSchema = z.object({
  orderNumber: z.string(),
  status: OrderStatusSchema,
  customerName: z.string(),
  customerPhone: z.string(),
  deliveryAddress: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  deliveryFee: z.number(),
  total: z.number(),
  createdAt: z.string().datetime(),
  items: z.array(
    z.object({
      id: z.string(),
      productName: z.string(),
      variantName: z.string().optional(),
      addOnNames: z.array(z.string()),
      quantity: z.number(),
      price: z.number(),
    })
  ),
});

export type Order = z.infer<typeof OrderSchema>;

export const InvoiceSchema = z.object({
  invoiceId: z.string(),
  orderNumber: z.string(),
  issuedAt: z.string().datetime(),
  taxRegistrationNumber: z.string(),
  customerDetails: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })
  ),
  subtotal: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  grandTotal: z.number(),
});

// ==========================================
// Admin Workflows
// ==========================================

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const AdminAuthResponseSchema = z.object({
  token: z.string(),
  admin: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});

export const AdminUpdateStatusSchema = z.object({
  status: OrderStatusSchema,
});

export const UpsertProductSchema = ProductSchema.omit({ id: true });