function fallbackEmbedding(text: string): number[] {
  // Use TF-inspired feature hashing for better keyword-based retrieval
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const vector = new Array(1536).fill(0);

  for (const word of words) {
    // Create multiple hash positions per word for better coverage
    for (let i = 0; i < word.length; i++) {
      const sub = word.slice(0, i + 1);
      let h = 2166136261;
      for (let j = 0; j < sub.length; j++) {
        h ^= sub.charCodeAt(j);
        h = Math.imul(h, 16777619);
      }
      const pos = Math.abs(h) % 1536;
      vector[pos] += 1;
    }
  }

  // Normalize
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  }
  return vector;
}

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallbackEmbedding(text);

  try {
    const OpenAI = (await import("openai")).default as any;
    const client = new OpenAI({ apiKey: key });

    const resp = await client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: text
    });

    const embedding = resp?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) return fallbackEmbedding(text);
    return embedding as number[];
  } catch {
    return fallbackEmbedding(text);
  }
}

export function keywordSearch(query: string, chunks: Array<{ content: string; fileName: string }>): Array<{ content: string; fileName: string; score: number }> {
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);

  return chunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      const regex = new RegExp(word, "gi");
      const matches = contentLower.match(regex);
      if (matches) {
        score += matches.length;
        // Bonus for exact phrase
        if (contentLower.includes(query.toLowerCase())) score += 5;
      }
    }
    // Normalize by query length
    score = queryWords.length > 0 ? score / queryWords.length : 0;
    return { ...chunk, score };
  }).filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}
