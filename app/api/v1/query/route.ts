import { NextResponse } from "next/server";
import { z } from "zod";
import { runQueryPipeline } from "@/lib/engine/query-pipeline";

export const runtime = "nodejs";

const QueryBodySchema = z.object({
  plugin: z.string().min(1),
  query: z.string().min(1),
  stream: z.boolean().optional()
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = QueryBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await runQueryPipeline({
    plugin: parsed.data.plugin,
    query: parsed.data.query
  });

  return NextResponse.json(result);
}

