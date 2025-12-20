import { Suspense } from 'react';
import prisma from '@/lib/db';
import ApprovalList from '@/components/Approvals/ApprovalList';

export const dynamic = 'force-dynamic';

async function getPendingApprovals() {
  try {
    const approvals = await prisma.approvalWorkflow.findMany({
      where: { status: 'PENDING' },
      include: {
        execute: {
          include: {
            project: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Serialize dates for Client Component
    return approvals.map(a => ({
      ...a,
      execute: {
        ...a.execute,
        startedAt: a.execute.startedAt.toISOString()
      },
      updatedAt: a.updatedAt.toISOString()
    })); // Simplify type matching
  } catch (e) {
    console.error("DB Error fetching approvals", e);
    return [];
  }
}

export default async function ApprovalsPage() {
  const approvals = await getPendingApprovals();

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Approvals</h2>
        <p className="text-gray-500">Review and authorize sensitive analysis continuations.</p>
      </header>
      
      <Suspense fallback={<div>Loading approvals...</div>}>
        <ApprovalList approvals={approvals as any} /> 
      </Suspense>
    </div>
  );
}
