import type { Request, Response } from 'express';
import { loginSchema } from './auth.validation';
import { login } from './auth.service';
import { COOKIE_ADMIN_ACCESS, type LoginResponse } from './auth.types';
import { sendSuccess } from '../../utils/response';

export async function loginController(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const { accessToken, admin } = await login(body);

  res.cookie(COOKIE_ADMIN_ACCESS, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess<LoginResponse>(res, { admin });
}
