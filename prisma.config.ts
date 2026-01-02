import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    // Use relative path for Prisma CLI compatibility
    url: 'file:./prisma/dev.db'
  }
})
