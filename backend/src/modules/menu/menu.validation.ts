import { z } from 'zod';
import {
  createProductRequestSchema,
  updateProductRequestSchema,
} from '@pokket-pizza/contract/contract';

export const cuidParamSchema = z.object({
  id: z.string().regex(/^c[0-9a-z]{20,}$/, 'Not a valid CUID'),
});

export const createProductSchema = createProductRequestSchema.strict();
export const updateProductSchema = updateProductRequestSchema.strict();
