import type { LoginRequest, LoginResponse } from '@pokket-pizza/contract/contract';

export const COOKIE_ADMIN_ACCESS = '__Host-admin_access';
export const ACCESS_TOKEN_TYP = 'admin-access';

export type AuthPrincipal = {
  id: string;
  restaurantId: string;
  role: string;
};

export type AdminRow = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  restaurantId: string;
};

export type AccessTokenClaims = {
  sub: string;
  iss: string;
  aud: string;
  typ: typeof ACCESS_TOKEN_TYP;
  role: string;
  restaurantId: string;
  jti: string;
  iat?: number;
  exp?: number;
};

export type { LoginRequest, LoginResponse };

declare global {
  namespace Express {
    interface Request {
      admin?: AuthPrincipal;
    }
  }
}
