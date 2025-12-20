
import prisma from '@/lib/db'
import { IssueTable } from '@/components/issue-table'
import { WhatIfSimulator } from '@/components/what-if-simulator'
import { Prisma } from '@prisma/client'

interface Props {
  params: {
    id: string
  }
}

async function getExpertData(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        analyses: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: {
            results: true
          }
        },
        stats: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    }) as any

    if (project && project.analyses.length > 0) {
       // Calculate a simple composite score if stats are missing
       const latestStats = project.stats[0]
       const currentScore = latestStats 
          ? (latestStats.codeQualityScore + latestStats.securityScore + latestStats.maintainabilityScore) / 3 
          : 70

       return {
         issues: project.analyses[0].results,
         currentScore: currentScore || 70,
         projectName: project.name
       }
    }
  } catch (error) {
    console.error("Failed to fetch expert data, using mock:", error)
  }

  // Fallback Mock Data
  return {
    projectName: 'JaCodeLens (Mock)',
    currentScore: 78,
    issues: [
      { id: '1', category: 'SECURITY', severity: 'CRITICAL', message: 'Hardcoded AWS Secret Key found', filePath: 'src/config/aws.ts', reviewStatus: 'OPEN', confidenceScore: 0.95 },
      { id: '2', category: 'ARCHITECTURE', severity: 'HIGH', message: 'Circular Dependency: Service -> Utils -> Service', filePath: 'src/services/UserService.ts', reviewStatus: 'OPEN', confidenceScore: 1.0 },
      { id: '3', category: 'QUALITY', severity: 'MEDIUM', message: 'Complex function (Cyclomatic Complexity > 15)', filePath: 'src/lib/parser.ts', reviewStatus: 'OPEN', confidenceScore: 0.8 },
      { id: '4', category: 'SECURITY', severity: 'MEDIUM', message: 'Insecure HTTP usage', filePath: 'src/api/client.ts', reviewStatus: 'FIXED', confidenceScore: 0.7 },
      { id: '5', category: 'OPERATIONS', severity: 'LOW', message: 'Missing logging in error handler', filePath: 'src/middleware/error.ts', reviewStatus: 'OPEN', confidenceScore: 0.6 },
    ]
  }
}

export default async function ExpertReviewPage({ params }: Props) {
  const data = await getExpertData(params.id)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
               Expert Review Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Triaging, Validation, and Impact Simulation.</p>
          </div>
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
             <span className="text-sm text-slate-400">Project:</span> <span className="font-mono text-emerald-400 ml-2">{data.projectName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Column: What-if Simulation */}
           <div className="lg:col-span-1">
              <div className="sticky top-8">
                <WhatIfSimulator issues={data.issues} baseScore={data.currentScore} />
                
                <div className="mt-6 p-4 rounded-lg bg-emerald-900/10 border border-emerald-900/30">
                  <h4 className="text-emerald-400 font-semibold mb-2 text-sm">Review Guidelines</h4>
                  <ul className="text-xs text-emerald-200/70 space-y-2 list-disc list-inside">
                     <li>Mark <strong>False Positives</strong> to train the agents.</li>
                     <li>Prioritize <strong>Critical</strong> security issues first.</li>
                     <li>Use <strong>Wont Fix</strong> for legacy code we don't touch.</li>
                  </ul>
                </div>
              </div>
           </div>

           {/* Right Column: Issue Management */}
           <div className="lg:col-span-2">
              <IssueTable issues={data.issues} />
           </div>
        </div>

      </div>
    </div>
  )
}
