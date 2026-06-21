import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDecisionTree, loadDecisionTree, listDocuments } from "@/lib/engine/knowledge-store";

export const runtime = "nodejs";

const TreeSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(["condition", "question", "action"]),
    label: z.string(),
    config: z.record(z.unknown()).default({})
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional()
  }))
});

export async function GET(_req: Request, ctx: { params: Promise<{ plugin: string }> }) {
  const { plugin } = await ctx.params;
  const tree = await loadDecisionTree(plugin);
  return NextResponse.json({ plugin, tree });
}

export async function PUT(req: Request, ctx: { params: Promise<{ plugin: string }> }) {
  const { plugin } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = TreeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid tree data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await saveDecisionTree(plugin, parsed.data);
  return NextResponse.json({ ok: true });
}
