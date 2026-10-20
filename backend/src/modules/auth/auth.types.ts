import type { LoginRequest, LoginResponse } from '@pokket-pizza/contract/contract';

export const COOKIE_ADMIN_ACCESS = '__Host-admin_access';
export const COOKIE_ADMIN_REFRESH = '__Host-admin_refresh';
export const ACCESS_TOKEN_TYP = 'admin-access';
export const REFRESH_TOKEN_TYP = 'admin-refresh';

export const COOKIE_CUSTOMER_ACCESS = '__Host-customer_access';
export const COOKIE_CUSTOMER_REFRESH = '__Host-customer_refresh';
export const CUSTOMER_ACCESS_TOKEN_TYP = 'customer-access';
export const CUSTOMER_REFRESH_TOKEN_TYP = 'customer-refresh';

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

export type RefreshTokenClaims = {
  sub: string;
  iss: string;
  aud: string;
  typ: typeof REFRESH_TOKEN_TYP;
  jti: string;
  iat?: number;
  exp?: number;
};

export type RefreshTokenRow = {
  jti: string;
  familyId: string;
  adminId: string | null;
  customerId: string | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

export type CustomerPrincipal = {
  id: string;
  restaurantId: string;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  passwordHash: string | null;
  restaurantId: string;
  whatsappOrderUpdates: boolean;
  whatsappStatusUpdates: boolean;
  theme: string;
};

export type CustomerAccessClaims = {
  sub: string;
  iss: string;
  aud: string;
  typ: typeof CUSTOMER_ACCESS_TOKEN_TYP;
  restaurantId: string;
  jti: string;
  iat?: number;
  exp?: number;
};

export type CustomerRefreshTokenClaims = {
  sub: string;
  iss: string;
  aud: string;
  typ: typeof CUSTOMER_REFRESH_TOKEN_TYP;
  jti: string;
  iat?: number;
  exp?: number;
};

// Single source of preference defaults + serialization, shared by the auth
// session probe (GET /auth/customer/me) and the customer profile module (#45).
export const DEFAULT_CUSTOMER_PREFERENCES = {
  whatsappOrderUpdates: true,
  whatsappStatusUpdates: true,
  theme: 'system',
} as const;

export type CustomerPreferences = {
  whatsappOrderUpdates: boolean;
  whatsappStatusUpdates: boolean;
  theme: 'system' | 'light' | 'dark';
};

// Stored theme is a free String column; anything unexpected (legacy row, a
// value the API enum does not know yet) degrades to 'system'.
export function toCustomerPreferences(row: {
  whatsappOrderUpdates: boolean;
  whatsappStatusUpdates: boolean;
  theme: string;
}): CustomerPreferences {
  return {
    whatsappOrderUpdates: row.whatsappOrderUpdates,
    whatsappStatusUpdates: row.whatsappStatusUpdates,
    theme: row.theme === 'light' || row.theme === 'dark' ? row.theme : 'system',
  };
}

export type { LoginRequest, LoginResponse };

declare global {
  namespace Express {
    interface Request {
      id?: string;
      admin?: AuthPrincipal;
      customer?: CustomerPrincipal;
    }
  }
}
