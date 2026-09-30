import type { Request, Response } from 'express';
import { loginSchema } from './auth.validation';
import { login, refreshSession, revokeSessionBestEffort } from './auth.service';
import {
  COOKIE_ADMIN_ACCESS,
  COOKIE_ADMIN_REFRESH,
  type LoginResponse,
} from './auth.types';
import { AuthError } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
} as const;

function setSessionCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(COOKIE_ADMIN_ACCESS, accessToken, COOKIE_OPTS);
  res.cookie(COOKIE_ADMIN_REFRESH, refreshToken, COOKIE_OPTS);
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const { accessToken, refreshToken, admin } = await login(body, req.ip ?? 'unknown');

  setSessionCookies(res, accessToken, refreshToken);

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess<LoginResponse>(res, { admin });
}

export async function refreshController(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[COOKIE_ADMIN_REFRESH];
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new AuthError();
  }

  const { accessToken, refreshToken: nextRefresh, admin } = await refreshSession(refreshToken);
  setSessionCookies(res, accessToken, nextRefresh);

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess<LoginResponse>(res, { admin });
}

export async function logoutController(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[COOKIE_ADMIN_REFRESH];
  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    await revokeSessionBestEffort(refreshToken);
  }

  res.clearCookie(COOKIE_ADMIN_ACCESS, COOKIE_OPTS);
  res.clearCookie(COOKIE_ADMIN_REFRESH, COOKIE_OPTS);

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(res, { ok: true });
}
