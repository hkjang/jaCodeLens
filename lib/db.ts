import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import path from 'path'

const prismaClientSingleton = () => {
  const dbPath = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`
  console.log('[DB] Connecting to:', dbPath)
  
  const libsql = createClient({
    url: dbPath
  })
  // Workaround: Set env var to satisfy potential internal checks
  process.env.DATABASE_URL = dbPath
  
  const adapter = new PrismaLibSql(libsql as any)
  return new PrismaClient({ adapter })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
