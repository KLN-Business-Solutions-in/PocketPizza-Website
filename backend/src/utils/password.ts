import { getPrisma } from '../config/database';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<Array<{ hash: string }>>`
    SELECT crypt(${password}, gen_salt('bf', 12)) AS hash
  `;
  const hash = rows[0]?.hash;
  if (!hash) throw new Error('Password hashing failed');
  return hash;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash) return false;
  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT (${hash} = crypt(${password}, ${hash})) AS ok
  `;
  return rows[0]?.ok === true;
}

let dummyHash: Promise<string> | undefined;

export function getDummyPasswordHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = hashPassword(`timing-equalizer-not-a-real-password-${BCRYPT_COST}`);
  }
  return dummyHash;
}
