import fs from 'fs/promises'
import path from 'path'
import ignore from 'ignore'
import { FileInfo, ProjectContext } from './types'

// Setup default ignore rules (like .git, node_modules)
const DEFAULT_IGNORES = [
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.DS_Store',
  '*.log',
  '.env*',
  // Add large binary folders if needed
]

export async function collectProject(projectPath: string): Promise<ProjectContext> {
  const ig = ignore().add(DEFAULT_IGNORES)

  // specific .gitignore check
  try {
    const gitignorePath = path.join(projectPath, '.gitignore')
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
    ig.add(gitignoreContent)
  } catch (e) {
    // No .gitignore found, proceed with defaults
  }

  const files: FileInfo[] = []
  const ignoredFiles: string[] = []
  let totalSize = 0
  const languageEstimates: Record<string, number> = {}

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      const relativePath = path.relative(projectPath, fullPath)

      if (ig.ignores(relativePath)) {
        ignoredFiles.push(relativePath)
        continue
      }

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath)
          // limit max file size to read (e.g. 1MB)
          const MAX_SIZE = 1024 * 1024
          let content = ''
          
          if (stats.size < MAX_SIZE) {
            // Check if binary - simple heuristic or just read text
            // For now, try read utf-8, if fails constraint, might be binary
            // Just attempting read for text files
            const ext = path.extname(entry.name).toLowerCase()
            const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html', '.prisma', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h']
             
            if (textExtensions.includes(ext) || ext === '') {
                 content = await fs.readFile(fullPath, 'utf-8')
            }
          }

          const fileInfo: FileInfo = {
            path: relativePath,
            name: entry.name,
            extension: path.extname(entry.name),
            size: stats.size,
            content: content || undefined,
            lastModified: stats.mtime
          }

          files.push(fileInfo)
          totalSize += stats.size

          // Count extension for language estimate
          const ext = fileInfo.extension || '(no-ext)'
          languageEstimates[ext] = (languageEstimates[ext] || 0) + 1
          
        } catch (err) {
            console.warn(`Failed to process file ${relativePath}`, err)
        }
      }
    }
  }

  await walk(projectPath)

  return {
    path: projectPath,
    files,
    ignoredFiles,
    totalSize,
    languageEstimates
  }
}
