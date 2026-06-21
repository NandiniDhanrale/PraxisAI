import { NextResponse } from "next/server";
import { getQueryLogs } from "@/lib/engine/knowledge-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const plugin = searchParams.get("plugin") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const logs = await getQueryLogs(plugin, limit);

  const totalQueries = logs.length;
  const avgLatency = totalQueries > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalQueries)
    : 0;
  const confidenceBreakdown = {
    high: logs.filter((l) => l.confidence === "high").length,
    medium: logs.filter((l) => l.confidence === "medium").length,
    low: logs.filter((l) => l.confidence === "low").length
  };
  const citationRate = totalQueries > 0
    ? Math.round((logs.filter((l) => (l.citations?.length ?? 0) > 0).length / totalQueries) * 100)
    : 0;

  const topQuestions = (() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      const q = log.query.slice(0, 80);
      counts.set(q, (counts.get(q) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
  })();

  const queriesOverTime = (() => {
    const byDate = new Map<string, number>();
    for (const log of logs) {
      const date = log.createdAt.slice(0, 10);
      byDate.set(date, (byDate.get(date) ?? 0) + 1);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  })();

  return NextResponse.json({
    totalQueries,
    avgLatency,
    confidenceBreakdown,
    citationRate,
    topQuestions,
    queriesOverTime,
    recentLogs: logs.slice(0, 20)
  });
}
