'use client'

import { analyzeProject } from '@/app/actions'
import { useState } from 'react'

export function AnalysisButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await analyzeProject(projectId)
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
    >
      {loading ? 'Analyzing...' : 'Run Analysis'}
    </button>
  )
}
