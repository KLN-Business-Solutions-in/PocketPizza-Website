import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient as WorkerPrismaClient } from '../generated/prisma/client';
import type { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let connectionStringOverride: string | undefined;

// workerd forbids using any I/O object (sockets included) from a request other
// than the one that created it, so a module-scoped pooled client breaks on the
// second request. Workers therefore get one client per request; Node keeps a
// long-lived pool.
export const isWorkersRuntime =
  typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';

type RequestDatabase = { prisma?: PrismaClient };

const requestPrisma = new AsyncLocalStorage<RequestDatabase>();

export function configureDatabase(connectionString: string | undefined): void {
  if (connectionString) connectionStringOverride = connectionString;
}

// generated at runtime: a literal specifier would make Wrangler bundle the
// Node client (and its base64 wasm) into the Worker as well
const NODE_CLIENT_MODULE = '../generated/prisma-node/client';

async function createPrismaClient(): Promise<PrismaClient> {
  const connectionString = connectionStringOverride || env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const log: ('warn' | 'error')[] =
    env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

  if (isWorkersRuntime) {
    return new WorkerPrismaClient({
      adapter: new PrismaNeon({ connectionString, max: 1 }),
      log,
    });
  }

  const { PrismaClient: NodePrismaClient } = (await import(NODE_CLIENT_MODULE)) as {
    PrismaClient: new (options: Record<string, unknown>) => PrismaClient;
  };
  return new NodePrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      keepAlive: true,
    }),
    log,
  });
}

export async function getPrisma(): Promise<PrismaClient> {
  const scoped = requestPrisma.getStore();
  if (scoped) {
    if (!scoped.prisma) scoped.prisma = await createPrismaClient();
    return scoped.prisma;
  }

  if (isWorkersRuntime) {
    // no request scope: never share the client across requests, and let the
    // pool idle out if the caller fails to disconnect
    return createPrismaClient();
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = await createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export async function runWithRequestDatabase<T>(fn: () => Promise<T>): Promise<T> {
  const scope: RequestDatabase = {};
  try {
    return await requestPrisma.run(scope, fn);
  } finally {
    if (scope.prisma) await scope.prisma.$disconnect().catch(() => undefined);
  }
}
