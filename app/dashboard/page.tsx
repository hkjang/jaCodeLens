import { Suspense } from 'react';
import prisma from '@/lib/db'; // Will crash if DB broken, but code is correct
import { Activity, ShieldAlert, BarChart3, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
     // Mock stats if DB fails for UI dev purposes
     // In prod, remove try-catch or handle error gracefully
    const projectCount = await prisma.project.count();
    const pendingApprovals = await prisma.approvalWorkflow.count({ where: { status: 'PENDING' } });
    const criticalIssues = await prisma.analysisResult.count({ where: { severity: 'CRITICAL' } });
    
    return { projectCount, pendingApprovals, criticalIssues };
  } catch (e) {
    console.error("DB Error", e);
    return { projectCount: 0, pendingApprovals: 0, criticalIssues: 0, error: true };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-gray-500">System Overview & Activity</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Projects" 
          value={stats.projectCount} 
          icon={<BarChart3 className="w-6 h-6 text-blue-500" />} 
          trend="+2 this week"
        />
        <StatCard 
          title="Pending Approvals" 
          value={stats.pendingApprovals} 
          icon={<Clock className="w-6 h-6 text-amber-500" />} 
          trend="Action Required"
          isWarning={stats.pendingApprovals > 0}
        />
        <StatCard 
          title="Critical Issues" 
          value={stats.criticalIssues} 
          icon={<ShieldAlert className="w-6 h-6 text-red-500" />} 
          trend="-5% vs last month"
          isCritical={stats.criticalIssues > 0}
        />
      </div>

      {stats.error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          Warning: Database connection failed. Showing placeholder/empty data.
        </div>
      )}

      {/* Recent Activity Section (Placeholder) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="text-gray-400 text-sm">Loading activity stream...</div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, isWarning, isCritical }: any) {
  return (
    <div className={`p-6 rounded-xl border shadow-sm transition-all hover:shadow-md bg-white dark:bg-gray-800 ${isCritical ? 'border-red-200 bg-red-50/50' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className={`text-sm ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'}`}>
        {trend}
      </div>
    </div>
  );
}
