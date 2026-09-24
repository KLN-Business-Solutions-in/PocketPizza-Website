import { z } from 'zod';

export const cuidParamSchema = z.object({
  id: z.string().regex(/^c[0-9a-z]{20,}$/, 'Not a valid CUID'),
});
