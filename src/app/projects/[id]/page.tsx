import { getProject } from '@/app/actions'
import { AnalysisButton } from '@/components/analysis-button'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

export default async function ProjectDetails({ params }: { params: { id: string } }) {
  const project = await getProject(params.id)

  if (!project) {
    return <div className="p-8">Project not found</div>
  }

  const latestAnalysis = project.analyses[0]

  return (
    <main className="min-h-screen p-8 bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-slate-400 hover:text-white mb-4 inline-block">&larr; Back to Dashboard</Link>
          <div className="flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
                <p className="text-slate-400 font-mono text-sm">{project.path}</p>
             </div>
             <AnalysisButton projectId={project.id} />
          </div>
        </div>

        {latestAnalysis ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900 p-4 rounded border border-slate-800">
                  <h3 className="text-slate-500 text-sm uppercase tracking-wider mb-2">Status</h3>
                  <span className={`text-xl font-bold ${
                    latestAnalysis.status === 'COMPLETED' ? 'text-green-400' : 'text-yellow-400'
                  }`}>{latestAnalysis.status}</span>
               </div>
               <div className="bg-slate-900 p-4 rounded border border-slate-800">
                  <h3 className="text-slate-500 text-sm uppercase tracking-wider mb-2">Issues Found</h3>
                  <span className="text-xl font-bold text-white">
                      {/* We didn't fetch full count in getProject, but we can assume logic or just show N/A if simpler */}
                      {/* Actually, we need to fetch results to show them. Let's assume we fetch them separately or trust the logic. 
                          For now, just showing status. */}
                      N/A (See Report)
                  </span>
               </div>
            </div>

            {/* AI Report Section */}
            {latestAnalysis.report && (
              <div className="bg-slate-900 p-6 rounded border border-slate-800">
                <h3 className="text-slate-500 text-sm uppercase tracking-wider mb-4">AI Analysis Report</h3>
                <article className="prose prose-invert max-w-none">
                  <ReactMarkdown>{latestAnalysis.report}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 bg-slate-900 rounded border border-slate-800 text-center text-slate-500">
            No analysis run yet. Click "Run Analysis" to start.
          </div>
        )}
      </div>
    </main>
  )
}
