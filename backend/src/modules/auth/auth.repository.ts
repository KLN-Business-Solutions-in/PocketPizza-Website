import { getPrisma } from '../../config/database';
import type { AdminRow } from './auth.types';

const select = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  role: true,
  restaurantId: true,
} as const;

export async function findAdminByEmail(email: string): Promise<AdminRow | null> {
  const prisma = await getPrisma();
  return prisma.adminUser.findUnique({ where: { email }, select });
}

export async function findAdminById(id: string): Promise<AdminRow | null> {
  const prisma = await getPrisma();
  return prisma.adminUser.findUnique({ where: { id }, select });
}
