
'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface Dependency {
  from: string
  to: string
  type: string
}

interface Props {
  dependencies: Dependency[]
}

export function ArchitectureMap({ dependencies }: Props) {
  // 1. Identify Nodes and Layers
  const nodes = useMemo(() => {
    const allPaths = new Set<string>()
    dependencies.forEach(d => {
      allPaths.add(d.from)
      allPaths.add(d.to)
    })
    return Array.from(allPaths).map(path => {
      const parts = path.split('/')
      // Simple heuristic: Top-level folder or specific typical layers
      let layer = 'Other'
      if (path.includes('controller') || path.includes('app') || path.includes('page')) layer = 'Presentation'
      else if (path.includes('service') || path.includes('use-case')) layer = 'Business Logic'
      else if (path.includes('repository') || path.includes('db') || path.includes('prisma')) layer = 'Data Access'
      else if (path.includes('util') || path.includes('lib') || path.includes('common')) layer = 'Utils'
      
      return { path, name: parts[parts.length - 1], layer }
    })
  }, [dependencies])

  // 2. Group by Layer
  const layers = ['Presentation', 'Business Logic', 'Data Access', 'Utils', 'Other']
  const layeredNodes = useMemo(() => {
    const grouped: Record<string, typeof nodes> = {}
    layers.forEach(l => grouped[l] = [])
    nodes.forEach(n => grouped[n.layer].push(n))
    return grouped
  }, [nodes])

  // Simple column layout calculations
  const COLUMN_WIDTH = 250
  const ROW_HEIGHT = 60
  const NODE_WIDTH = 200
  const NODE_HEIGHT = 40

  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number, y: number }> = {}
    layers.forEach((layer, colIndex) => {
      const layerNodes = layeredNodes[layer]
      layerNodes.forEach((node, rowIndex) => {
        positions[node.path] = {
          x: colIndex * COLUMN_WIDTH + 20,
          y: rowIndex * ROW_HEIGHT + 50
        }
      })
    })
    return positions
  }, [layeredNodes])

  return (
    <div className="w-full h-[600px] overflow-auto bg-slate-900 rounded-xl p-4 border border-slate-700 relative">
      <h3 className="text-white mb-4 font-semibold">Architecture Dependency Map (Layered)</h3>
      
      <svg className="w-full h-full min-w-[1000px] min-h-[500px]">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        {/* Edges */}
        {dependencies.map((dep, idx) => {
          const start = nodePositions[dep.from]
          const end = nodePositions[dep.to]
          if (!start || !end) return null

          return (
            <motion.line
              key={`${dep.from}-${dep.to}-${idx}`}
              x1={start.x + NODE_WIDTH}
              y1={start.y + NODE_HEIGHT / 2}
              x2={end.x}
              y2={end.y + NODE_HEIGHT / 2}
              stroke="#64748b"
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.5 }}
              transition={{ duration: 1, delay: idx * 0.05 }}
              whileHover={{ stroke: '#38bdf8', opacity: 1, strokeWidth: 2 }}
            />
          )
        })}

        {/* Nodes */}
        {Object.entries(nodePositions).map(([path, pos]) => {
            const node = nodes.find(n => n.path === path)!
            // Color based on layer
            let color = 'bg-slate-800'
            let borderColor = 'border-slate-600'
            if (node.layer === 'Presentation') borderColor = 'border-purple-500'
            if (node.layer === 'Business Logic') borderColor = 'border-blue-500'
            if (node.layer === 'Data Access') borderColor = 'border-green-500'
            
            return (
                <foreignObject key={path} x={pos.x} y={pos.y} width={NODE_WIDTH} height={NODE_HEIGHT}>
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-full h-full ${color} border-l-4 ${borderColor} rounded shadow-sm flex items-center px-3 text-xs text-slate-200 truncate cursor-pointer hover:bg-slate-700 transition-colors`}
                        title={path}
                    >
                        {node.name}
                    </motion.div>
                </foreignObject>
            )
        })}
        
        {/* Layer Labels */}
        {layers.map((layer, idx) => (
            <text key={layer} x={idx * COLUMN_WIDTH + 20} y={30} fill="#94a3b8" fontSize="14" fontWeight="bold">
                {layer}
            </text>
        ))}

      </svg>
    </div>
  )
}
