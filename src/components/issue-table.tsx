
'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, Play } from 'lucide-react'
import { updateIssueStatus } from '@/app/actions'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: string[]) {
  return twMerge(clsx(inputs))
}

interface Issue {
  id: string
  category: string
  severity: string
  message: string
  filePath?: string | null
  reviewStatus: string // "OPEN" | "FIXED" | "FALSE_POSITIVE" | "WONT_FIX"
  confidenceScore: number
}

interface Props {
  issues: Issue[]
  onStatusChange?: () => void
}

export function IssueTable({ issues, onStatusChange }: Props) {
  const [filter, setFilter] = useState('ALL')
  const [updating, setUpdating] = useState<string | null>(null)

  const filteredIssues = issues.filter(i => {
    if (filter === 'ALL') return true
    if (filter === 'OPEN') return i.reviewStatus === 'OPEN'
    if (filter === 'RESOLVED') return i.reviewStatus !== 'OPEN'
    return true
  })

  async function handleStatusUpdate(id: string, status: string) {
    setUpdating(id)
    await updateIssueStatus(id, status)
    setUpdating(null)
    if (onStatusChange) onStatusChange()
  }

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'text-red-500 font-bold'
      case 'HIGH': return 'text-orange-500 font-bold'
      case 'MEDIUM': return 'text-yellow-500'
      case 'LOW': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        <button 
          onClick={() => setFilter('ALL')}
          className={cn("px-3 py-1 rounded-full border", filter === 'ALL' ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700 text-slate-400")}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('OPEN')}
          className={cn("px-3 py-1 rounded-full border", filter === 'OPEN' ? "bg-red-600/20 border-red-800 text-red-200" : "border-slate-700 text-slate-400")}
        >
          Open
        </button>
        <button 
          onClick={() => setFilter('RESOLVED')}
          className={cn("px-3 py-1 rounded-full border", filter === 'RESOLVED' ? "bg-green-600/20 border-green-800 text-green-200" : "border-slate-700 text-slate-400")}
        >
          Resolved
        </button>
      </div>

      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-4">Severity</th>
              <th className="p-4">Use Case / Issue</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredIssues.map(issue => (
              <tr key={issue.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-4">
                   <span className={severityColor(issue.severity)}>{issue.severity}</span>
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-200">{issue.message}</div>
                  <div className="text-xs text-slate-500 mt-1">{issue.filePath}</div>
                </td>
                <td className="p-4 text-slate-400">{issue.category}</td>
                <td className="p-4">
                   <div className={cn("px-2 py-1 rounded text-xs inline-block", 
                     issue.reviewStatus === 'OPEN' ? 'bg-slate-800 text-slate-300' : 
                     issue.reviewStatus === 'FIXED' ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'
                   )}>
                     {issue.reviewStatus}
                   </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {issue.reviewStatus === 'OPEN' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(issue.id, 'FIXED')}
                          disabled={updating === issue.id}
                          className="p-1 hover:bg-green-900/30 rounded text-green-500 disabled:opacity-50"
                          title="Mark Fixed"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(issue.id, 'FALSE_POSITIVE')}
                          disabled={updating === issue.id}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-50"
                          title="False Positive"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {issue.reviewStatus !== 'OPEN' && (
                       <button 
                         onClick={() => handleStatusUpdate(issue.id, 'OPEN')}
                         disabled={updating === issue.id}
                         className="p-1 hover:bg-slate-700 rounded text-blue-400 disabled:opacity-50"
                         title="Re-open"
                       >
                         <Play size={16} className="rotate-180" />
                       </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
