import path from 'node:path'
import { defineConfig } from 'prisma/config'

const dbPath = path.resolve(__dirname, 'prisma', 'dev.db')

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: `file:${dbPath}`
  },
  migrate: {
    adapter: async () => {
      const { PrismaLibSql } = await import('@prisma/adapter-libsql')
      const { createClient } = await import('@libsql/client')
      const libsql = createClient({ url: `file:${dbPath}` })
      return new PrismaLibSql(libsql as any)
    }
  }
})
