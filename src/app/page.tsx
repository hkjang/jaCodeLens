import { getProjects } from '@/app/actions'
import { ProjectForm } from '@/components/project-form'
import Link from 'next/link'

export default async function Home() {
  const projects = await getProjects()

  return (
    <main className="min-h-screen p-8 bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">JaCodeLens Dashboard</h1>
        
        <ProjectForm />

        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    <Link href={`/projects/${project.id}`} className="hover:text-blue-400">
                      {project.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-slate-400 font-mono">{project.path}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    project.analyses[0]?.status === 'COMPLETED' ? 'bg-green-900 text-green-300' :
                    project.analyses[0]?.status === 'FAILED' ? 'bg-red-900 text-red-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {project.analyses[0]?.status || 'NO ANALYSIS'}
                  </span>
                </div>
              </div>
              
              {project.stats[0] && (
                <div className="mt-4 flex gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-500">Quality</span>
                    <span className="font-mono font-bold text-blue-300">{project.stats[0].codeQualityScore?.toFixed(0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500">Security</span>
                    <span className="font-mono font-bold text-purple-300">{project.stats[0].securityScore?.toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No projects found. Add a local path to start analysis.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
