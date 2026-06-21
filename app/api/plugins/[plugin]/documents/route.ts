import { NextResponse } from "next/server";
import { z } from "zod";
import { listDocuments, upsertDocument, deleteDocument } from "@/lib/engine/knowledge-store";

export const runtime = "nodejs";

const UploadSchema = z.object({
  fileName: z.string().min(1),
  text: z.string().min(1),
  chunkSize: z.number().int().min(200).max(4000).optional()
});

export async function GET(_req: Request, ctx: { params: Promise<{ plugin: string }> }) {
  const { plugin } = await ctx.params;
  const docs = await listDocuments(plugin);
  return NextResponse.json({ plugin, documents: docs });
}

export async function POST(req: Request, ctx: { params: Promise<{ plugin: string }> }) {
  const { plugin } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = UploadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const doc = await upsertDocument({
    plugin,
    fileName: parsed.data.fileName,
    text: parsed.data.text,
    chunkSize: parsed.data.chunkSize
  });

  return NextResponse.json({ ok: true, documentId: doc.documentId, chunks: doc.chunks.length });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ plugin: string }> }) {
  const { plugin } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId query parameter" }, { status: 400 });
  }

  const deleted = await deleteDocument(plugin, documentId);
  return NextResponse.json({ ok: deleted });
}
