import { z } from "zod";
import { createOrderRequestSchema, type CreateOrderRequest } from "@shared/contract/contract";
import { normalizeIndianPhone } from "@/lib/phone";

/**
 * Day 5 checkout validation.
 *
 * The contract absorbed the two rules this shim originally existed for
 * (2026-09-27, pending standup sign-off): `indianPhoneSchema` and the
 * conditional-address `superRefine` now live in shared/contract/contract.ts,
 * along with the 6-digit pincode rule and the quantity cap.
 *
 * What remains here is frontend-only UX polish:
 *  - a friendly name trim/required message,
 *  - a phone transform that normalises via the same `src/lib/phone.ts`
 *    helper the submit path uses, so the validated form value and the
 *    request body can never disagree.
 *
 * Note: `.safeExtend` is required — `.extend` throws on the contract schema
 * because it carries refinements (zod4).
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

export const checkoutSchema = createOrderRequestSchema.safeExtend({
  customer: createOrderRequestSchema.shape.customer.extend({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(255, "Name is too long"),
    phone: indianPhoneSchema,
  }),
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
