
import { createClient } from '@libsql/client'
import path from 'path'

async function tryConnect(url: string) {
  console.log(`Trying URL: ${url}`)
  try {
    const client = createClient({ url })
    await client.execute('SELECT 1')
    console.log('✅ Success!')
    return true
  } catch (e: any) {
    console.log('❌ Failed:', e.code || e.message)
    return false
  }
}

async function main() {
  const cwd = process.cwd().replace(/\\/g, '/')
  const variants = [
    `file:${path.join(process.cwd(), 'dev.db')}`, // Original bad one?
    `file://${cwd}/dev.db`, // The one I tried
    `file:/${cwd}/dev.db`,
    `file:${cwd}/dev.db`,
    'file:dev.db', // Simple relative
    'file:./dev.db'
  ]

  for (const v of variants) {
    if (await tryConnect(v)) break
  }
}

main()
