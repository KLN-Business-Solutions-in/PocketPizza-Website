import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { AuthInvalidError, RateLimitError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { findAdminByEmail } from './auth.repository';
import {
  ACCESS_TOKEN_TYP,
  type AdminRow,
  type LoginResponse,
} from './auth.types';

const logger = createChildLogger({ module: 'auth' });

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

type LockEntry = { fails: number; windowStart: number; lockedUntil: number };
const loginFailures = new Map<string, LockEntry>();

function pruneFailures(): void {
  if (loginFailures.size <= 500) return;
  const now = Date.now();
  for (const [key, entry] of loginFailures) {
    if (entry.lockedUntil <= now && now - entry.windowStart > LOCKOUT_WINDOW_MS) {
      loginFailures.delete(key);
    }
  }
}

function assertNotLocked(email: string): void {
  const entry = loginFailures.get(email);
  if (!entry) return;
  const now = Date.now();
  if (entry.lockedUntil > now) {
    throw new RateLimitError('Account temporarily locked due to repeated failed logins');
  }
  if (entry.lockedUntil > 0 || now - entry.windowStart > LOCKOUT_WINDOW_MS) {
    loginFailures.delete(email);
  }
}

function recordFailure(email: string): void {
  const now = Date.now();
  const entry = loginFailures.get(email);
  if (!entry || now - entry.windowStart > LOCKOUT_WINDOW_MS) {
    loginFailures.set(email, { fails: 1, windowStart: now, lockedUntil: 0 });
    pruneFailures();
    return;
  }
  entry.fails += 1;
  if (entry.fails >= LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    logger.warn({ email, fails: entry.fails }, 'Login locked after repeated failures');
  }
}

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
  assertNotLocked(email);
  const admin = await findAdminByEmail(email);

  let passwordOk = false;
  if (admin) {
    passwordOk = await argon2.verify(admin.passwordHash, input.password);
  } else {
    await argon2.verify(await getDummyHash(), input.password);
  }

  if (!admin || !passwordOk) {
    recordFailure(email);
    throw new AuthInvalidError();
  }

  loginFailures.delete(email);
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
