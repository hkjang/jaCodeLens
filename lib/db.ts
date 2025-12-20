import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const prismaClientSingleton = () => {
  // In-memory DB for testing
  const url = "file::memory:";
  
  process.env.DATABASE_URL = url;
  console.log('[DB] Initializing with URL:', url);
  
  const libsql = createClient({
    url,
  })
  // Cast to fix type mismatch between @libsql/client version and adapter expectations
  const adapter = new PrismaLibSql({ url } as any)
  console.log('[DB] Adapter created:', !!adapter);

  return new PrismaClient({
    adapter,
    log: ['error', 'warn']
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export let prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export function setPrisma(mock: any) {
  prisma = mock;
}

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
