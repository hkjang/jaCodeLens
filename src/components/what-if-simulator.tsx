
'use client'

import React, { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: string[]) {
  return twMerge(clsx(inputs))
}

interface Issue {
  id: string
  severity: string
  message: string
  category: string
}

interface Props {
  issues: Issue[]
  baseScore: number
}

export function WhatIfSimulator({ issues, baseScore }: Props) {
  // Use local state to track "simulated fixes"
  const [simulatedFixes, setSimulatedFixes] = useState<Set<string>>(new Set())

  const toggleFix = (id: string) => {
    const next = new Set(simulatedFixes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSimulatedFixes(next)
  }

  // Simple heuristic scoring model
  // Start with a 'perfect' score concept or relative deduction
  // Let's assume the baseScore passed in is the CURRENT score (e.g., 75)
  // And we know the CURRENT issues.
  // We can calculate "Potential Gain".
  
  const calculatePenalty = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 15
      case 'HIGH': return 8
      case 'MEDIUM': return 3
      case 'LOW': return 1
      default: return 0
    }
  }

  const scores = useMemo(() => {
    // Calculate total theoretical penalty of current open issues
    // Just for relative comparison
    let currentPenalty = 0
    let recoveredScore = 0

    issues.forEach(issue => {
      const p = calculatePenalty(issue.severity)
      currentPenalty += p
      if (simulatedFixes.has(issue.id)) {
        recoveredScore += p
      }
    })

    // Cap the potential score at 100
    const projectedScore = Math.min(100, baseScore + recoveredScore)
    
    return { current: baseScore, projected: projectedScore, recovered: recoveredScore }
  }, [issues, baseScore, simulatedFixes])

  // Get top impact issues (not yet fixed)
  const topOpportunities = issues
    .filter(i => !simulatedFixes.has(i.id))
    .sort((a, b) => calculatePenalty(b.severity) - calculatePenalty(a.severity))
    .slice(0, 5)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">What-if Analysis</h3>
          <p className="text-slate-400 text-sm">Simulate fixes to project health score.</p>
        </div>
        <button 
           onClick={() => setSimulatedFixes(new Set())}
           className="text-xs text-blue-400 hover:text-blue-300"
        >
          Reset Simulation
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="text-center p-4 bg-slate-950 rounded-lg border border-slate-800">
           <div className="text-slate-400 text-sm uppercase tracking-wider mb-1">Current Score</div>
           <div className="text-4xl font-bold text-slate-200">{Math.round(scores.current)}</div>
        </div>
        <div className="text-center p-4 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-transparent pointer-events-none" />
           <div className="text-green-400 text-sm uppercase tracking-wider mb-1">Projected Score</div>
           <div className="text-4xl font-bold text-green-400">{Math.round(scores.projected)}</div>
           {scores.recovered > 0 && (
             <div className="text-xs text-green-500 font-medium mt-1">+{Math.round(scores.recovered)} pts</div>
           )}
        </div>
      </div>

      <div className="space-y-3">
         <h4 className="text-sm font-semibold text-slate-300">Top Improvement Opportunities</h4>
         {topOpportunities.length === 0 && (
            <p className="text-sm text-slate-500 italic">No major issues remaining.</p>
         )}
         {topOpportunities.map(issue => (
           <div 
             key={issue.id} 
             onClick={() => toggleFix(issue.id)}
             className="flex items-center gap-3 p-3 rounded bg-slate-800/50 hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-600 transition-all group"
           >
             <div className="flex-shrink-0 w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center group-hover:border-green-500">
               <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-green-500 transition-colors" />
             </div>
             <div className="flex-1 min-w-0">
               <div className="text-sm text-slate-200 truncate">{issue.message}</div>
               <div className="flex gap-2 text-xs mt-0.5">
                  <span className={cn(
                    "font-medium", 
                    issue.severity === 'CRITICAL' ? 'text-red-400' : 
                    issue.severity === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'
                  )}>
                    {issue.severity} (+{calculatePenalty(issue.severity)})
                  </span>
                  <span className="text-slate-500">{issue.category}</span>
               </div>
             </div>
           </div>
         ))}
      </div>
    </div>
  )
}
