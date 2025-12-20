import { AnalysisResult } from '@prisma/client';
import prisma from './db';

interface DebtCalculation {
  hours: number;
  cost: number;
  risk: number; // 0-1
}

const HOURLY_RATE = 100; // Default hourly rate

export function calculateDebtForItem(result: AnalysisResult): DebtCalculation {
  let hours = 0;
  let risk = 0.1;

  switch (result.severity) {
    case 'CRITICAL':
      hours = 8;
      risk = 0.9;
      break;
    case 'HIGH':
      hours = 4;
      risk = 0.6;
      break;
    case 'MEDIUM':
      hours = 2;
      risk = 0.3;
      break;
    case 'LOW':
      hours = 0.5;
      risk = 0.1;
      break;
    case 'INFO':
      hours = 0.1;
      risk = 0.01;
      break;
    default:
      hours = 1;
      risk = 0.1;
  }

  // Adjust based on category
  if (result.category === 'SECURITY') {
    risk = Math.min(1.0, risk * 1.5);
    hours *= 1.2; // Security fixes often take verify time
  } else if (result.category === 'ARCHITECTURE') {
    hours *= 2.0; // Architectural changes are expensive
  }

  return {
    hours,
    cost: hours * HOURLY_RATE,
    risk
  };
}

export async function aggregateTechDebt(projectId: string) {
  // 1. Get latest analysis execution for the project
  const latestExec = await prisma.analysisExecute.findFirst({
    where: { projectId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    include: { results: true }
  });

  if (!latestExec) return null;

  // 2. Clear existing debt records for cleaner state (or append? requirements say "quantify", usually implies current state)
  // For this implementing, we will recalculate current debt snapshot.
  await prisma.techDebt.deleteMany({ where: { projectId } });

  const debtMap = new Map<string, { count: number, hours: number, cost: number, maxRisk: number }>();
  
  // Initialize categories
  ['CODE', 'ARCHITECTURE', 'OPERATIONS', 'SECURITY'].forEach(c => {
    debtMap.set(c, { count: 0, hours: 0, cost: 0, maxRisk: 0 });
  });

  // 3. Iterate results and sum up
  for (const res of latestExec.results) {
    const calc = calculateDebtForItem(res);
    const category = mapCategory(res.category);
    
    const current = debtMap.get(category) || { count: 0, hours: 0, cost: 0, maxRisk: 0 };
    current.count++;
    current.hours += calc.hours;
    current.cost += calc.cost;
    current.maxRisk = Math.max(current.maxRisk, calc.risk);
    debtMap.set(category, current);
  }

  // 4. Save to DB
  for (const [category, stats] of debtMap.entries()) {
    if (stats.count > 0) {
      await prisma.techDebt.create({
        data: {
          projectId,
          category,
          issueCount: stats.count,
          remediationCostHours: Math.ceil(stats.hours),
          remediationCostCurrency: stats.cost,
          riskFactor: stats.maxRisk
        }
      });
    }
  }

  return debtMap;
}

function mapCategory(original: string): string {
  // Map AnalysisResult category (QUALITY, SECURITY, ARCHITECTURE, PERFORMANCE, OPERATIONS)
  // To TechDebt category (CODE, ARCHITECTURE, OPERATIONS, SECURITY)
  if (original === 'QUALITY') return 'CODE';
  if (original === 'PERFORMANCE') return 'CODE'; // or OPS
  if (original === 'SECURITY') return 'SECURITY';
  if (original === 'ARCHITECTURE') return 'ARCHITECTURE';
  if (original === 'OPERATIONS') return 'OPERATIONS';
  return 'CODE';
}
