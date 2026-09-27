import { z } from "zod";
import {
  addressSchema,
  createOrderRequestSchema,
  type CreateOrderRequest,
} from "@shared/contract/contract";
import { normalizeIndianPhone } from "@/lib/phone";

/**
 * Day 5 checkout validation.
 *
 * `shared/contract/contract.ts` is FROZEN (standup + both-team sign-off to
 * change), so this module never edits it. It imports the shared schemas as the
 * base and layers the two rules the sprint needs on top:
 *
 *  1. `customer.phone` in the contract is only `z.string().min(10).max(15)`,
 *     which happily accepts "+91 98765 43210abc". The sprint requires a
 *     10-digit Indian mobile, always required. The same normaliser the submit
 *     path uses (`src/lib/phone.ts`, mirroring backend §5.13) is reused here so
 *     the validated form value and the request body can never disagree.
 *
 *  2. Nothing in the contract makes `address` conditional. The sprint requires
 *     the address block to be required if and only if orderType is DELIVERY.
 *
 * ASK FOR BACKEND - this is a frontend-local shim until the contract absorbs
 * it: move `indianPhoneSchema` and the conditional-address `superRefine` into
 * shared/contract/contract.ts and this file collapses to a re-export. See
 * DAYS-4-6-AUDIT.md — "Open asks for other teams".
 */
/**
 * 10-digit Indian mobile, normalised to bare digits.
 * Transforms on success, so `handleSubmit` receives the digits to send.
 */
export const indianPhoneSchema = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .transform((raw, ctx) => {
    try {
      return normalizeIndianPhone(raw);
    } catch (err) {
      ctx.addIssue({
        code: "custom",
        message: (err as Error).message || "Enter a valid 10-digit Indian mobile number.",
      });
      return z.NEVER;
    }
  });

export const checkoutSchema = createOrderRequestSchema
  .extend({
    customer: createOrderRequestSchema.shape.customer.extend({
      name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(255, "Name is too long"),
      phone: indianPhoneSchema,
    }),
    // Frozen shared address shape, reused verbatim.
    address: addressSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.orderType !== "DELIVERY") return;
    const address = value.address;
    if (!address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "A delivery address is required for delivery orders.",
      });
      return;
    }
    // Re-check the required fields so each error attaches to its own input
    // rather than collapsing onto the address block.
    if (!address.line1.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["address", "line1"],
        message: "Address line 1 is required",
      });
    }
    if (!address.city.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["address", "city"],
        message: "City is required",
      });
    }
    if (!/^\d{4,10}$/.test(address.pincode.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["address", "pincode"],
        message: "Enter a valid pincode",
      });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;

export type { CreateOrderRequest };

/**
 * Strip the fields that must not reach the wire (blank optional address parts)
 * and hand the API exactly `CreateOrderRequest`.
 */
export function toCreateOrderRequest(values: CheckoutValues): CreateOrderRequest {
  const { orderType, items, customer, address, notes, idempotencyKey } = values;
  return {
    orderType,
    items,
    customer,
    ...(orderType === "DELIVERY" && address
      ? {
          address: {
            line1: address.line1.trim(),
            ...(address.line2?.trim() ? { line2: address.line2.trim() } : {}),
            ...(address.landmark?.trim() ? { landmark: address.landmark.trim() } : {}),
            city: address.city.trim(),
            pincode: address.pincode.trim(),
          },
        }
      : {}),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
}
