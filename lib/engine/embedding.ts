export async function embedText(text: string): Promise<number[]> {
  // Placeholder embedding: deterministic pseudo-vector to keep the pipeline working
  // without external providers configured.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const vec = new Array(1536).fill(0).map((_, idx) => ((hash + idx) % 1000) / 1000);
  return vec;
}

