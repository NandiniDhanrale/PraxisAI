import { cosineSimilarity } from "./vector";
import { keywordSearch } from "./embedding";
import { loadAllChunks } from "./knowledge-store";

export type RetrievedChunk = {
  document: string;
  content: string;
  page?: number | null;
  section?: string | null;
  score: number;
};

export async function retrieveChunks(args: {
  plugin: string;
  queryEmbedding: number[];
  query?: string;
  topK?: number;
}): Promise<{ chunks: RetrievedChunk[] }> {
  const topK = Math.max(1, Math.min(args.topK ?? 8, 20));
  const all = await loadAllChunks(args.plugin);
  if (all.length === 0) return { chunks: [] };

  // Try vector similarity first
  const vectorRanked = all
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(args.queryEmbedding, c.embedding)
    }))
    .sort((a, b) => b.score - a.score);

  const bestVectorScore = vectorRanked[0]?.score ?? 0;

  // If vector search found something decent, use it
  if (bestVectorScore > 0.3) {
    return {
      chunks: vectorRanked.slice(0, topK).map((r) => ({
        document: r.chunk.fileName,
        content: r.chunk.content,
        page: r.chunk.page ?? null,
        section: r.chunk.section ?? null,
        score: r.score
      }))
    };
  }

  // Otherwise, fall back to keyword search
  if (args.query) {
    const keywordResults = keywordSearch(args.query, all.map((c) => ({
      content: c.content,
      fileName: c.fileName,
      // pass through extra fields
      page: c.page,
      section: c.section,
      embedding: c.embedding,
      chunkId: c.chunkId,
      documentId: c.documentId
    } as any)));

    if (keywordResults.length > 0) {
      return {
        chunks: keywordResults.slice(0, topK).map((r) => ({
          document: r.fileName,
          content: r.content,
          page: (r as any).page ?? null,
          section: (r as any).section ?? null,
          score: Math.min(r.score / 5, 1) // normalize to 0-1
        }))
      };
    }
  }

  // Last resort: return the first N chunks (at least there's content)
  return {
    chunks: vectorRanked.slice(0, Math.min(3, topK)).map((r) => ({
      document: r.chunk.fileName,
      content: r.chunk.content,
      page: r.chunk.page ?? null,
      section: r.chunk.section ?? null,
      score: 0.1
    }))
  };
}
