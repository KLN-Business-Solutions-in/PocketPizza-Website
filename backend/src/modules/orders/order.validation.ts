import { z } from 'zod';
import {
  createOrderRequestSchema,
  quoteRequestSchema,
} from '@pokket-pizza/contract/contract';

export const quoteSchema = quoteRequestSchema.strict();
// Contract schema already applies .strict().superRefine() — the result is a
// ZodEffects, which has no .strict() of its own.
export const createOrderSchema = createOrderRequestSchema;
export const publicTokenParamSchema = z.object({
  publicToken: z.string().regex(/^[0-9a-z]{21,64}$/, 'Not a valid order token'),
});
