
'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: string[]) {
  return twMerge(clsx(inputs))
}

interface StatPoint {
  timestamp: string
  codeQualityScore: number
  securityScore: number
  maintainabilityScore: number
  opsRiskScore: number
}

interface Props {
  data: StatPoint[]
}

export function RiskTimeline({ data }: Props) {
  // Format dates
  const formattedData = data.map(d => ({
    ...d,
    date: new Date(d.timestamp).toLocaleDateString()
  }))

  return (
    <div className="w-full h-[400px] bg-slate-900 rounded-xl p-4 border border-slate-700">
      <h3 className="text-white mb-4 font-semibold">Risk & Quality Timeline</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Area type="monotone" dataKey="codeQualityScore" stackId="1" stroke="#8884d8" fill="url(#colorQuality)" name="Code Quality" />
          <Area type="monotone" dataKey="opsRiskScore" stackId="2" stroke="#ef4444" fill="url(#colorRisk)" name="Operational Risk" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
