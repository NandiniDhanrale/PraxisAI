import { NextResponse } from "next/server";
import { z } from "zod";
import { runCollaboration } from "@/lib/engine/collaboration";

export const runtime = "nodejs";

const CollaborateSchema = z.object({
  query: z.string().min(1),
  experts: z.array(z.string()).min(1).max(5),
  mode: z.enum(["debate", "consensus", "review"]),
  maxRounds: z.number().int().min(1).max(5).optional()
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CollaborateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await runCollaboration({
      query: parsed.data.query,
      experts: parsed.data.experts,
      mode: parsed.data.mode,
      maxRounds: parsed.data.maxRounds
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Collaboration failed" },
      { status: 500 }
    );
  }
}
