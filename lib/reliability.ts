import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from './db';

/**
 * Calculates a SHA-256 hash of the input used for analysis.
 * This ensures we can verify if the input data has changed for reproducibility.
 */
export async function calculateInputHash(projectPath: string): Promise<string> {
  // Ideally, we would walk the directory and hash all relevant files.
  // for now, we will hash the specific list of files or just the directory structure metadata if feasible.
  // Simplified version: Hash the list of top-level filenames and sizes.
  try {
    const files = await fs.promises.readdir(projectPath, { withFileTypes: true });
    const fileData = files
      .filter(f => f.isFile())
      .map(f => `${f.name}:${fs.statSync(path.join(projectPath, f.name)).size}`)
      .sort()
      .join(',');
    
    return crypto.createHash('sha256').update(fileData).digest('hex');
  } catch (error) {
    console.error(`Failed to calculate input hash for ${projectPath}:`, error);
    return 'HASH_CALCULATION_FAILED';
  }
}

/**
 * Creates a lightweight snapshot of the project state at the time of analysis.
 * In a real enterprise scenario, this might involve volume snapshots or git commit refs.
 * Here, we will just simulate it by storing a metadata JSON file in .gemini/snapshots.
 */
export async function createSnapshot(projectId: string, analysisId: string): Promise<string> {
  const snapshotDir = path.join(process.cwd(), '.gemini', 'snapshots');
  await fs.promises.mkdir(snapshotDir, { recursive: true });
  
  const snapshotFile = path.join(snapshotDir, `${projectId}_${analysisId}.json`);
  
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  
  const snapshotData = {
    projectId,
    analysisId,
    timestamp: new Date().toISOString(),
    projectName: project?.name,
    projectPath: project?.path,
  };
  
  await fs.promises.writeFile(snapshotFile, JSON.stringify(snapshotData, null, 2));
  return snapshotFile;
}
