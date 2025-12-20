import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    const execution = await prisma.analysisExecute.findUnique({
      where: { id: executionId },
      include: {
        project: true,
        agentExecutions: {
          include: {
            tasks: true,
          },
        },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    // Transform data for frontend
    const response = {
      id: execution.id,
      projectName: execution.project.name,
      status: execution.status,
      score: execution.score,
      startedAt: execution.startedAt,
      agents: execution.agentExecutions.map((ae: any) => ({
        id: ae.id,
        agentName: ae.agentName,
        status: ae.status,
        startedAt: ae.startedAt,
        completedAt: ae.completedAt,
        taskCount: ae.tasks.length,
        completedTaskCount: ae.tasks.filter((t: any) => t.status === "COMPLETED").length,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching execution status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
