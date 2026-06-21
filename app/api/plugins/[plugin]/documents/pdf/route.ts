import { NextResponse } from "next/server";
import { upsertDocument } from "@/lib/engine/knowledge-store";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ plugin: string }> }) {
  const { plugin } = await ctx.params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing `file` field" }, { status: 400 });
  }

  const pdfParse = (await import("pdf-parse")).default as any;

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await pdfParse(buf);
  const text = String(parsed?.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "No text extracted from PDF" }, { status: 400 });
  }

  const doc = await upsertDocument({
    plugin,
    fileName: file.name || "document.pdf",
    text,
    chunkSize: 1500,
    overlap: 200,
    fileType: "pdf"
  });

  return NextResponse.json({ ok: true, documentId: doc.documentId, chunks: doc.chunks.length });
}
