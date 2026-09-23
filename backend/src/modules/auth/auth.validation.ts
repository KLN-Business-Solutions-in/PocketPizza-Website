import {
  loginRequestSchema,
  type LoginRequest,
  type LoginResponse,
} from '@pokket-pizza/contract/contract';

export const loginSchema = loginRequestSchema.strict();
export type { LoginRequest, LoginResponse };
