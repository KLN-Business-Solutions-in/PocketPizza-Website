import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { AuthInvalidError } from '../../utils/errors';
import { findAdminByEmail } from './auth.repository';
import {
  ACCESS_TOKEN_TYP,
  type AdminRow,
  type LoginResponse,
} from './auth.types';

let dummyHashPromise: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash('timing-equalizer-not-a-real-password');
  }
  return dummyHashPromise;
}

async function signAccessToken(admin: AdminRow): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({
    typ: ACCESS_TOKEN_TYP,
    role: admin.role,
    restaurantId: admin.restaurantId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(admin.id)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .setJti(randomUUID())
    .sign(secret);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ accessToken: string; admin: LoginResponse['admin'] }> {
  const email = input.email.toLowerCase().trim();
  const admin = await findAdminByEmail(email);

  let passwordOk = false;
  if (admin) {
    passwordOk = await argon2.verify(admin.passwordHash, input.password);
  } else {
    await argon2.verify(await getDummyHash(), input.password);
  }

  if (!admin || !passwordOk) {
    throw new AuthInvalidError();
  }

  const accessToken = await signAccessToken(admin);

  return {
    accessToken,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}
