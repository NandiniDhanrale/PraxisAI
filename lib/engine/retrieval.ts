import { cosineSimilarity } from "./vector";
import { loadAllChunks } from "./knowledge-store";

export type RetrievedChunk = {
  document: string;
  content: string;
  page?: number | null;
  section?: string | null;
};

export async function retrieveChunks(args: {
  plugin: string;
  queryEmbedding: number[];
  topK?: number;
}): Promise<{ chunks: RetrievedChunk[] }> {
  const topK = Math.max(1, Math.min(args.topK ?? 5, 20));
  const all = await loadAllChunks(args.plugin);
  if (all.length === 0) return { chunks: [] };

  const ranked = all
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(args.queryEmbedding, c.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    chunks: ranked.map((r) => ({
      document: r.chunk.fileName,
      content: r.chunk.content,
      page: r.chunk.page ?? null,
      section: r.chunk.section ?? null
    }))
  };
}
