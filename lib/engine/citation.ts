import type { RetrievedChunk } from "./retrieval";

export function mapCitations(answer: string, chunks: RetrievedChunk[]) {
  const citations = chunks.slice(0, 5).map((c) => ({
    document: c.document,
    page: c.page ?? null,
    section: c.section ?? null,
    excerpt: c.content.slice(0, 240)
  }));

  return { answer, citations };
}

