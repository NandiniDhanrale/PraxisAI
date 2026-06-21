import type { RetrievedChunk } from "./retrieval";

export function mapCitations(answer: string, chunks: RetrievedChunk[]) {
  const sourcePattern = /\[Source\s+(\d+)\]/gi;
  const matches = [...answer.matchAll(sourcePattern)];
  const usedIndices = new Set(matches.map((m) => parseInt(m[1], 10) - 1));

  let citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
    score?: number;
  }>;

  if (usedIndices.size > 0) {
    citations = [...usedIndices]
      .filter((i) => i >= 0 && i < chunks.length)
      .map((i) => {
        const c = chunks[i];
        return {
          document: c.document,
          page: c.page ?? null,
          section: c.section ?? null,
          excerpt: c.content.slice(0, 300),
          score: c.score
        };
      });
  } else {
    citations = chunks.slice(0, 5).map((c) => ({
      document: c.document,
      page: c.page ?? null,
      section: c.section ?? null,
      excerpt: c.content.slice(0, 300),
      score: c.score
    }));
  }

  return { answer, citations };
}
