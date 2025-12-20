import prisma from '@/lib/db';

/**
 * Auto-generates a remediation roadmap based on high-priority technical debt.
 */
export async function generateRemediationRoadmap(projectId: string, budgetLimit: number) {
  // 1. Fetch Tech Debt Items
  const debtItems = await prisma.techDebt.findMany({
    where: { projectId },
    orderBy: [
      { riskFactor: 'desc' },
      { remediationCostHours: 'asc' } // Quick wins second
    ]
  });

  let currentCost = 0;
  const roadmap = [];

  for (const item of debtItems) {
    const cost = item.remediationCostCurrency || (item.remediationCostHours || 0) * 100; // Assume $100/hr
    
    if (currentCost + cost <= budgetLimit) {
      roadmap.push(item);
      currentCost += cost;
    }
  }

  return {
    roadmapItems: roadmap,
    totalEstimatedCost: currentCost,
    remainingBudget: budgetLimit - currentCost
  };
}

/**
 * Calculates total necessary budget to fix all Critical issues.
 */
export async function calculateCriticalBudget(projectId: string) {
   const criticalDebts = await prisma.techDebt.findMany({
    where: { projectId, riskFactor: { gte: 0.8 } } // Assuming 0.8+ is critical
  });
  
  const totalCost = criticalDebts.reduce((sum, item) => 
    sum + (item.remediationCostCurrency || (item.remediationCostHours || 0) * 100), 0
  );

  return totalCost;
}
