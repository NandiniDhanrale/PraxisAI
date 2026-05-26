export type Chunk = {
  chunkId: string;
  content: string;
  page?: number | null;
  section?: string | null;
};

export function chunkText(args: { text: string; chunkSize?: number; overlap?: number }): Chunk[] {
  const chunkSize = Math.max(200, Math.min(args.chunkSize ?? 1500, 4000));
  const overlap = Math.max(0, Math.min(args.overlap ?? 200, chunkSize - 1));
  const text = (args.text ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const chunks: Chunk[] = [];
  let offset = 0;
  while (offset < text.length) {
    const end = Math.min(text.length, offset + chunkSize);
    const slice = text.slice(offset, end);
    const idx = chunks.length;
    chunks.push({
      chunkId: `chunk-${idx}-${offset}`,
      content: slice.trim(),
      page: null,
      section: null
    });
    if (end >= text.length) break;
    offset += chunkSize - overlap;
  }
  return chunks.filter((c) => c.content.length > 0);
}
