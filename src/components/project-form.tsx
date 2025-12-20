'use client'

import { createProject } from '@/app/actions'
import { useState } from 'react'

export function ProjectForm() {
  const [path, setPath] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await createProject(path, '')
    setLoading(false)
    setPath('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Enter absolute project path..."
        className="flex-1 p-2 border rounded bg-slate-800 text-white border-slate-700"
        required
      />
      <button 
        type="submit" 
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Project'}
      </button>
    </form>
  )
}
