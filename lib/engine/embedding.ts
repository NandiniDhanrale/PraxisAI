function fallbackEmbedding(text: string): number[] {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return new Array(1536).fill(0).map((_, idx) => ((hash + idx) % 1000) / 1000);
}

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallbackEmbedding(text);

  const OpenAI = (await import("openai")).default as any;
  const client = new OpenAI({ apiKey: key });

  const resp = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: text
  });

  const embedding = resp?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) return fallbackEmbedding(text);
  return embedding as number[];
}
