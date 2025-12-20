import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const dbPath = process.env.DATABASE_URL || 'file:./dev.db'
  return new PrismaClient({
    datasources: {
      db: {
        url: dbPath,
      },
    },
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
