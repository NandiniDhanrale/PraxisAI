export type Chunk = {
  chunkId: string;
  content: string;
  page?: number | null;
  section?: string | null;
};

export function chunkText(args: { text: string; chunkSize?: number }): Chunk[] {
  const chunkSize = Math.max(200, Math.min(args.chunkSize ?? 1500, 4000));
  const text = (args.text ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const chunks: Chunk[] = [];
  let offset = 0;
  let idx = 0;
  while (offset < text.length) {
    const slice = text.slice(offset, offset + chunkSize);
    chunks.push({
      chunkId: `chunk-${idx}`,
      content: slice.trim(),
      page: null,
      section: null
    });
    offset += chunkSize;
    idx += 1;
  }
  return chunks.filter((c) => c.content.length > 0);
}

