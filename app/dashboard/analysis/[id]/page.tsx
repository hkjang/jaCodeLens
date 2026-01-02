import { Suspense } from 'react';
import prisma from '@/lib/db';
import ResultCard from '@/components/Results/ResultCard';

export const dynamic = 'force-dynamic';

async function getAnalysisDetails(id: string) {
  try {
     const execute = await prisma.analysisExecute.findUnique({
       where: { id },
       include: {
         project: true,
         results: {
           orderBy: { severity: 'desc' } // Critical first
         }
       }
     });
     return execute;
  } catch (e) {
    console.error("DB Error", e);
    return null;
  }
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAnalysisDetails(id);

  if (!data) return <div>Analysis not found (or DB error)</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analysis Results</h2>
          <p className="text-gray-500">
            Project: {data.project.name} | Status: {data.status} | Score: {data.score?.toFixed(1) || 'N/A'}
          </p>
        </div>
        <div className="text-sm text-right">
           <div>Hash: <span className="font-mono">{data.inputHash?.substring(0, 8) || 'N/A'}</span></div>
           <div>{new Date(data.startedAt).toLocaleString()}</div>
        </div>
      </header>

      <div className="space-y-6">
        {data.results.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded border">No issues found. Clean code!</div>
        ) : (
          data.results.map((result: any) => (
            <ResultCard key={result.id} result={result} />
          ))
        )}
      </div>
    </div>
  );
}
