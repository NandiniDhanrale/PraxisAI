import { NextResponse } from "next/server";
import { z } from "zod";
import { runQueryPipeline } from "@/lib/engine/query-pipeline";

export const runtime = "nodejs";

const QueryBodySchema = z.object({
  plugin: z.string().min(1),
  query: z.string().min(1),
  stream: z.boolean().optional(),
  parameters: z.record(z.string()).optional()
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

  if (parsed.data.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        try {
          send("meta", { plugin: parsed.data.plugin });
          const result = await runQueryPipeline({
            plugin: parsed.data.plugin,
            query: parsed.data.query,
            parameters: parsed.data.parameters,
            onToken: (delta) => send("token", delta)
          });
          send("final", result);
        } catch (err) {
          send("error", { message: err instanceof Error ? err.message : "Unknown error" });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive"
      }
    });
  }

  const result = await runQueryPipeline({
    plugin: parsed.data.plugin,
    query: parsed.data.query,
    parameters: parsed.data.parameters
  });
  return NextResponse.json(result);
}
