// Force set DATABASE_URL before any Prisma imports
// This is necessary because .env might have an empty DATABASE_URL
const DB_URL = 'file:./prisma/dev.db';
process.env.DATABASE_URL = DB_URL;

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const prismaClientSingleton = () => {
  // Prisma 7.x: Pass config options directly to PrismaLibSql adapter
  const adapter = new PrismaLibSql({
    url: DB_URL,
  })

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
