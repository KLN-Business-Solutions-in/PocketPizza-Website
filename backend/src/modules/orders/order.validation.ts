import { z } from 'zod';
import {
  createOrderRequestSchema,
  quoteRequestSchema,
} from '@pokket-pizza/contract/contract';
import type { OrderStatus, OrderType } from '@pokket-pizza/contract/contract';

export const quoteSchema = quoteRequestSchema.strict();
// Contract schema already applies .strict().superRefine() — the result is a
// ZodEffects, which has no .strict() of its own.
export const createOrderSchema = createOrderRequestSchema;
export const publicTokenParamSchema = z.object({
  publicToken: z.string().regex(/^[0-9a-z]{21,64}$/, 'Not a valid order token'),
});

export const adminOrderIdParamSchema = z.object({
  id: z.string().min(1).max(64),
});

const BASE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Server-authoritative mirror of §17 / KanbanBoard rules:
// READY → OUT_FOR_DELIVERY only for DELIVERY; READY → COMPLETED only for
// PICKUP/DINE_IN; terminals reject everything incl. same-status "transitions".
export function isTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
  orderType: OrderType,
): boolean {
  if (!BASE_TRANSITIONS[from].includes(to)) return false;
  if (from === 'READY' && to === 'OUT_FOR_DELIVERY') return orderType === 'DELIVERY';
  if (from === 'READY' && to === 'COMPLETED') return orderType !== 'DELIVERY';
  return true;
}
