export type RetrievedChunk = {
  document: string;
  content: string;
  page?: number | null;
  section?: string | null;
};

export async function retrieveChunks(_args: {
  plugin: string;
  queryEmbedding: number[];
}): Promise<{ chunks: RetrievedChunk[] }> {
  // Placeholder: no DB wired yet.
  return { chunks: [] };
}

