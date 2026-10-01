import { getPrisma } from '../../config/database';
import type { AdminRow, RefreshTokenRow } from './auth.types';

const select = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  role: true,
  restaurantId: true,
} as const;

const refreshTokenSelect = {
  jti: true,
  familyId: true,
  adminId: true,
  usedAt: true,
  revokedAt: true,
  expiresAt: true,
} as const;

export async function findAdminByEmail(email: string): Promise<AdminRow | null> {
  const prisma = await getPrisma();
  return prisma.adminUser.findUnique({ where: { email }, select });
}

export async function findAdminById(id: string): Promise<AdminRow | null> {
  const prisma = await getPrisma();
  return prisma.adminUser.findUnique({ where: { id }, select });
}

export async function insertRefreshToken(row: {
  jti: string;
  familyId: string;
  adminId: string;
  expiresAt: Date;
}): Promise<void> {
  const prisma = await getPrisma();
  await prisma.refreshToken.create({ data: row });
}

export async function findRefreshTokenByJti(jti: string): Promise<RefreshTokenRow | null> {
  const prisma = await getPrisma();
  return prisma.refreshToken.findUnique({ where: { jti }, select: refreshTokenSelect });
}

// Atomic: only the first caller may consume the token; a 0-count means the
// token was already spent (replay or lost race) — caller must revoke family.
export async function consumeRefreshToken(jti: string): Promise<boolean> {
  const prisma = await getPrisma();
  const res = await prisma.refreshToken.updateMany({
    where: { jti, usedAt: null, revokedAt: null },
    data: { usedAt: new Date() },
  });
  return res.count === 1;
}

export async function revokeRefreshFamily(familyId: string): Promise<void> {
  const prisma = await getPrisma();
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function pruneExpiredRefreshTokens(): Promise<void> {
  const prisma = await getPrisma();
  await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
