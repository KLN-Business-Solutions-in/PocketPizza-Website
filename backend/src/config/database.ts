import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma: any };

async function createPrismaClient(): Promise<any> {
  // @ts-ignore — @prisma/client installed by DB team
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export async function getPrisma(): Promise<any> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = await createPrismaClient();

  if (env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}
