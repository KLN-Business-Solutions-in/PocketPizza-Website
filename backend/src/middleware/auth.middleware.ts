import type { NextFunction, Request, Response } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env';
import { AuthError } from '../utils/errors';
import { findAdminById } from '../modules/auth/auth.repository';
import {
  ACCESS_TOKEN_TYP,
  COOKIE_ADMIN_ACCESS,
  type AccessTokenClaims,
} from '../modules/auth/auth.types';

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_ADMIN_ACCESS];
    if (typeof token !== 'string' || token.length === 0) {
      throw new AuthError();
    }

    const secret = new TextEncoder().encode(env.JWT_SECRET);
    let payload: AccessTokenClaims;
    try {
      ({ payload } = (await jwtVerify(token, secret, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      })) as { payload: AccessTokenClaims });
    } catch {
      throw new AuthError();
    }

    const claims = payload as Partial<AccessTokenClaims>;
    if (claims.typ !== ACCESS_TOKEN_TYP || typeof claims.sub !== 'string') {
      throw new AuthError();
    }

    const admin = await findAdminById(claims.sub);
    if (!admin) {
      throw new AuthError();
    }

    req.admin = {
      id: admin.id,
      restaurantId: admin.restaurantId,
      role: admin.role,
    };
    next();
  } catch (err) {
    // jwtVerify failures → AuthError above; infra/Prisma pass through as 500
    next(err);
  }
}
