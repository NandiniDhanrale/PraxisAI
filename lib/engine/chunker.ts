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

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: Chunk[] = [];
  let currentContent = "";
  let offset = 0;

  for (const para of paragraphs) {
    if (currentContent.length + para.length > chunkSize && currentContent.length > 0) {
      const idx = chunks.length;
      chunks.push({
        chunkId: `chunk-${idx}-${offset}`,
        content: currentContent.trim(),
        page: null,
        section: null
      });
      offset += currentContent.length;
      const overlapText = currentContent.slice(-overlap);
      currentContent = overlapText + "\n\n" + para;
    } else {
      currentContent = currentContent ? currentContent + "\n\n" + para : para;
    }
  }

  if (currentContent.trim().length > 0) {
    const idx = chunks.length;
    chunks.push({
      chunkId: `chunk-${idx}-${offset}`,
      content: currentContent.trim(),
      page: null,
      section: null
    });
  }

  return chunks;
}
