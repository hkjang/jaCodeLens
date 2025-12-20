export interface FileInfo {
  path: string
  name: string
  extension: string
  size: number
  content?: string
  lastModified: Date
}

export interface ProjectContext {
  path: string
  files: FileInfo[]
  ignoredFiles: string[]
  totalSize: number
  languageEstimates: Record<string, number>
}
