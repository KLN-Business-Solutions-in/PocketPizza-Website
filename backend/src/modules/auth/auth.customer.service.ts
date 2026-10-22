import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import {
  AppError,
  AuthError,
  AuthInvalidError,
  ValidationError,
} from '../../utils/errors';
import { createChildLogger } from '../../utils/logger';
import { getDummyPasswordHash, hashPassword, verifyPassword } from '../../utils/password';
import { assertStrongPassword } from '../../utils/passwordPolicy';
import { normalizeIndianPhone } from '../../utils/phone';
import {
  findCustomerById,
  findCustomerByPhone,
  findFirstRestaurantId,
  findRefreshTokenByJti,
  insertRefreshToken,
  pruneExpiredRefreshTokens,
  revokeRefreshFamily,
  rotateRefreshToken,
  setCustomerCredential,
  createCustomerWithCredential,
} from './auth.repository';
import {
  CUSTOMER_ACCESS_TOKEN_TYP,
  CUSTOMER_REFRESH_TOKEN_TYP,
  toCustomerPreferences,
  type CustomerPreferences,
  type CustomerRefreshTokenClaims,
  type CustomerRow,
} from './auth.types';
import type {
  CustomerLoginInput,
  CustomerSignupInput,
} from './auth.customer.validation';

const logger = createChildLogger({ module: 'customer-auth' });

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

type LockEntry = { fails: number; windowStart: number; lockedUntil: number };
const loginFailures = new Map<string, LockEntry>();

// keyed by source + account: anonymous failures must only lock that source's
// own attempts, never the account globally (lockout-DoS, CWE-645)
function lockKey(ip: string, phone: string): string {
  return `${ip}::${phone}`;
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

function assertNotLocked(ip: string, phone: string): void {
  const entry = loginFailures.get(lockKey(ip, phone));
  if (!entry) return;
  const now = Date.now();
  if (entry.lockedUntil > now) {
    throw new AppError('ACCOUNT_LOCKED', 'Account temporarily locked due to repeated failed logins', 429);
  }
  if (entry.lockedUntil > 0 || now - entry.windowStart > LOCKOUT_WINDOW_MS) {
    loginFailures.delete(lockKey(ip, phone));
  }
}

function recordFailure(ip: string, phone: string): void {
  const key = lockKey(ip, phone);
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
    logger.warn({ ip, fails: entry.fails }, 'Customer login locked after repeated failures');
  }
}

function normalizePhone(raw: string): string {
  try {
    return normalizeIndianPhone(raw);
  } catch {
    throw new ValidationError('Invalid phone number');
  }
}

async function signCustomerAccessToken(
  customer: Pick<CustomerRow, 'id' | 'restaurantId'>,
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({
    typ: CUSTOMER_ACCESS_TOKEN_TYP,
    restaurantId: customer.restaurantId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(customer.id)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .setJti(randomUUID())
    .sign(secret);
}

async function signCustomerRefreshToken(
  customer: Pick<CustomerRow, 'id'>,
  jti: string,
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({ typ: CUSTOMER_REFRESH_TOKEN_TYP })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(customer.id)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .setJti(jti)
    .sign(secret);
}

function toCustomerPublic(row: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}): { id: string; name: string; phone: string; email: string | null } {
  return { id: row.id, name: row.name, phone: row.phone, email: row.email };
}

function newRefreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

type CustomerSessionResponse = {
  accessToken: string;
  refreshToken: string;
  customer: { id: string; name: string; phone: string; email: string | null };
};

async function issueCustomerSession(account: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  restaurantId: string;
}): Promise<CustomerSessionResponse> {
  const familyId = randomUUID();
  const refreshJti = randomUUID();
  await insertRefreshToken({
    jti: refreshJti,
    familyId,
    customerId: account.id,
    expiresAt: newRefreshExpiry(),
  });
  await pruneExpiredRefreshTokens();

  return {
    accessToken: await signCustomerAccessToken(account),
    refreshToken: await signCustomerRefreshToken(account, refreshJti),
    customer: toCustomerPublic(account),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

export async function customerSignup(
  input: CustomerSignupInput,
  ip: string,
): Promise<CustomerSessionResponse & { created: boolean }> {
  const phone = normalizePhone(input.phone);
  assertStrongPassword(input.password, [
    input.name,
    phone,
    input.email ?? '',
    'pocketpizza',
    'pizza',
  ]);
  const email = input.email ?? null;

  let account = await findCustomerByPhone(phone);
  if (!account) {
    const restaurantId = await findFirstRestaurantId();
    if (!restaurantId) {
      throw new AppError('RESTAURANT_NOT_CONFIGURED', 'No restaurant is configured', 500);
    }
    const passwordHash = await hashPassword(input.password);
    try {
      const created = await createCustomerWithCredential({
        restaurantId,
        name: input.name,
        phone,
        email,
        passwordHash,
      });
      return { ...(await issueCustomerSession(created)), created: true };
    } catch (err) {
      // lost a concurrent-signup race: fall through to the existing-account path.
      // any other unique violation here is the email (phone row is absent).
      if (!isUniqueViolation(err)) throw err;
      const retry = await findCustomerByPhone(phone);
      if (!retry) {
        throw new AppError(
          'EMAIL_EXISTS',
          'This email address is already registered.',
          409,
        );
      }
      account = retry;
    }
  }

  if (account.passwordHash) {
    throw new AppError(
      'ACCOUNT_EXISTS',
      'An account with this phone number already exists. Please log in.',
      409,
    );
  }

  // claim a guest row (created by an earlier guest checkout): keep the stored
  // name (first-writer-wins, consistent with checkout) — no OTP proof of phone
  // possession exists in MVP scope, documented tradeoff
  let claimed: boolean;
  try {
    claimed = await setCustomerCredential({
      id: account.id,
      passwordHash: await hashPassword(input.password),
      email,
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    throw new AppError('EMAIL_EXISTS', 'This email address is already registered.', 409);
  }
  if (!claimed) {
    throw new AppError(
      'ACCOUNT_EXISTS',
      'An account with this phone number already exists. Please log in.',
      409,
    );
  }
  return { ...(await issueCustomerSession({ ...account, email })), created: false };
}

export async function customerLogin(
  input: CustomerLoginInput,
  ip: string,
): Promise<CustomerSessionResponse> {
  const phone = normalizePhone(input.phone);
  assertNotLocked(ip, phone);
  const account = await findCustomerByPhone(phone);

  let passwordOk = false;
  if (account?.passwordHash) {
    passwordOk = await verifyPassword(account.passwordHash, input.password);
  } else {
    await verifyPassword(await getDummyPasswordHash(), input.password);
  }

  if (!account || !account.passwordHash || !passwordOk) {
    recordFailure(ip, phone);
    throw new AuthInvalidError();
  }

  loginFailures.delete(lockKey(ip, phone));
  return issueCustomerSession(account);
}

export async function customerRefreshSession(
  refreshToken: string,
): Promise<CustomerSessionResponse> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  let claims: CustomerRefreshTokenClaims;
  try {
    ({ payload: claims } = (await jwtVerify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    })) as { payload: CustomerRefreshTokenClaims });
  } catch {
    throw new AuthError();
  }
  if (
    claims.typ !== CUSTOMER_REFRESH_TOKEN_TYP ||
    typeof claims.sub !== 'string' ||
    !claims.jti
  ) {
    throw new AuthError();
  }

  const account = await findCustomerById(claims.sub);
  if (!account) throw new AuthError();

  // sign first (pure crypto, no DB): if signing fails, no row state changes
  const nextJti = randomUUID();
  const [accessToken, nextRefresh] = await Promise.all([
    signCustomerAccessToken(account),
    signCustomerRefreshToken(account, nextJti),
  ]);

  // consume + replacement insert in one family-locked transaction; rollback
  // leaves the old token untouched so a plain retry still works
  const rotated = await rotateRefreshToken(claims.jti, {
    jti: nextJti,
    customerId: account.id,
    expiresAt: newRefreshExpiry(),
  });
  if (!rotated) {
    const row = await findRefreshTokenByJti(claims.jti);
    if (row && row.usedAt && !row.revokedAt) {
      // replay of a consumed token: kill the entire login session (RFC 9700)
      await revokeRefreshFamily(row.familyId);
      logger.warn(
        { customerId: row.customerId, familyId: row.familyId },
        'customer refresh token reuse detected; family revoked',
      );
    }
    throw new AuthError();
  }

  return { accessToken, refreshToken: nextRefresh, customer: toCustomerPublic(account) };
}

// best-effort server-side logout: revoke the presented refresh token's family
// without ever blocking the cookie-clear response
export async function revokeCustomerSessionBestEffort(refreshToken: string): Promise<void> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (payload.typ !== CUSTOMER_REFRESH_TOKEN_TYP || !payload.jti) return;
    const row = await findRefreshTokenByJti(String(payload.jti));
    if (row) {
      await revokeRefreshFamily(row.familyId);
      logger.info(
        { familyId: row.familyId, customerId: row.customerId },
        'customer refresh family revoked on logout',
      );
    }
  } catch {
    // invalid/expired cookie: nothing to revoke, cookies still cleared below
  }
}

export async function getCustomerProfile(id: string): Promise<{
  customer: { id: string; name: string; phone: string; email: string | null };
  preferences: CustomerPreferences;
}> {
  const account = await findCustomerById(id);
  if (!account) throw new AuthError();
  return {
    customer: toCustomerPublic(account),
    preferences: toCustomerPreferences(account),
  };
}
