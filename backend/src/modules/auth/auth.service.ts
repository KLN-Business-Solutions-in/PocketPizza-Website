import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { AuthError, AuthInvalidError, RateLimitError } from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import {
  consumeRefreshToken,
  findAdminByEmail,
  findAdminById,
  findRefreshTokenByJti,
  insertRefreshToken,
  pruneExpiredRefreshTokens,
  revokeRefreshFamily,
} from './auth.repository';
import {
  ACCESS_TOKEN_TYP,
  REFRESH_TOKEN_TYP,
  type AdminRow,
  type LoginResponse,
  type RefreshTokenClaims,
} from './auth.types';

const logger = createChildLogger({ module: 'auth' });

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

type LockEntry = { fails: number; windowStart: number; lockedUntil: number };
const loginFailures = new Map<string, LockEntry>();

// keyed by source + account: anonymous failures must only lock that source's
// own attempts, never the account globally (lockout-DoS, CWE-645)
function lockKey(ip: string, email: string): string {
  return `${ip}::${email}`;
}

function pruneFailures(): void {
  if (loginFailures.size <= 500) return;
  const now = Date.now();
  for (const [key, entry] of loginFailures) {
    if (entry.lockedUntil <= now && now - entry.windowStart > LOCKOUT_WINDOW_MS) {
      loginFailures.delete(key);
    }
  }
}

function assertNotLocked(ip: string, email: string): void {
  const entry = loginFailures.get(lockKey(ip, email));
  if (!entry) return;
  const now = Date.now();
  if (entry.lockedUntil > now) {
    throw new RateLimitError('Account temporarily locked due to repeated failed logins');
  }
  if (entry.lockedUntil > 0 || now - entry.windowStart > LOCKOUT_WINDOW_MS) {
    loginFailures.delete(lockKey(ip, email));
  }
}

function recordFailure(ip: string, email: string): void {
  const key = lockKey(ip, email);
  const now = Date.now();
  const entry = loginFailures.get(key);
  if (!entry || now - entry.windowStart > LOCKOUT_WINDOW_MS) {
    loginFailures.set(key, { fails: 1, windowStart: now, lockedUntil: 0 });
    pruneFailures();
    return;
  }
  entry.fails += 1;
  if (entry.fails >= LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    logger.warn({ email, ip, fails: entry.fails }, 'Login locked after repeated failures');
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

async function signRefreshToken(admin: AdminRow, jti: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({ typ: REFRESH_TOKEN_TYP })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(admin.id)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .setJti(jti)
    .sign(secret);
}

function newRefreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  admin: LoginResponse['admin'];
};

function toLoginAdmin(admin: AdminRow): LoginResponse['admin'] {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

export async function refreshSession(refreshToken: string): Promise<SessionResponse> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  let claims: RefreshTokenClaims;
  try {
    ({ payload: claims } = (await jwtVerify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    })) as { payload: RefreshTokenClaims });
  } catch {
    throw new AuthError();
  }
  if (claims.typ !== REFRESH_TOKEN_TYP || typeof claims.sub !== 'string' || !claims.jti) {
    throw new AuthError();
  }

  const row = await findRefreshTokenByJti(claims.jti);
  if (!row || row.revokedAt) throw new AuthError();

  if (row.usedAt) {
    // replay of a consumed token: kill the entire login session (RFC 9700)
    await revokeRefreshFamily(row.familyId);
    logger.warn(
      { adminId: row.adminId, familyId: row.familyId },
      'refresh token reuse detected; family revoked',
    );
    throw new AuthError();
  }

  // re-load: role/restaurant changes and deletions take effect immediately
  const admin = await findAdminById(claims.sub);
  if (!admin) throw new AuthError();

  // atomic consume — 0 rows means a concurrent refresh won the race: revoke
  if (!(await consumeRefreshToken(claims.jti))) {
    await revokeRefreshFamily(row.familyId);
    throw new AuthError();
  }

  const nextJti = randomUUID();
  await insertRefreshToken({
    jti: nextJti,
    familyId: row.familyId,
    adminId: admin.id,
    expiresAt: newRefreshExpiry(),
  });

  return {
    accessToken: await signAccessToken(admin),
    refreshToken: await signRefreshToken(admin, nextJti),
    admin: toLoginAdmin(admin),
  };
}

// best-effort server-side logout: revoke the presented refresh token's family
// without ever blocking the cookie-clear response
export async function revokeSessionBestEffort(refreshToken: string): Promise<void> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (payload.typ !== REFRESH_TOKEN_TYP || !payload.jti) return;
    const row = await findRefreshTokenByJti(String(payload.jti));
    if (row) {
      await revokeRefreshFamily(row.familyId);
      logger.info({ familyId: row.familyId, adminId: row.adminId }, 'refresh family revoked on logout');
    }
  } catch {
    // invalid/expired cookie: nothing to revoke, cookies still cleared below
  }
}

export async function login(
  input: {
    email: string;
    password: string;
  },
  ip: string,
): Promise<SessionResponse> {
  const email = input.email.toLowerCase().trim();
  assertNotLocked(ip, email);
  const admin = await findAdminByEmail(email);

  let passwordOk = false;
  if (admin) {
    passwordOk = await argon2.verify(admin.passwordHash, input.password);
  } else {
    await argon2.verify(await getDummyHash(), input.password);
  }

  if (!admin || !passwordOk) {
    recordFailure(ip, email);
    throw new AuthInvalidError();
  }

  loginFailures.delete(lockKey(ip, email));

  // seed the refresh-token family for this login session (durable reuse tracking)
  const initialJti = randomUUID();
  await insertRefreshToken({
    jti: initialJti,
    familyId: randomUUID(),
    adminId: admin.id,
    expiresAt: newRefreshExpiry(),
  });
  await pruneExpiredRefreshTokens();

  return {
    accessToken: await signAccessToken(admin),
    refreshToken: await signRefreshToken(admin, initialJti),
    admin: toLoginAdmin(admin),
  };
}
