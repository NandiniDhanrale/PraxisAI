import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { embedText } from "./embedding";
import { chunkText } from "./chunker";

export type StoredChunk = {
  chunkId: string;
  content: string;
  embedding: number[];
  page?: number | null;
  section?: string | null;
};

export type StoredDocument = {
  documentId: string;
  plugin: string;
  fileName: string;
  createdAt: string;
  chunks: StoredChunk[];
};

function dataDir() {
  return path.join(process.cwd(), "data");
}

function pluginDir(plugin: string) {
  return path.join(dataDir(), "plugins", plugin);
}

function docsDir(plugin: string) {
  return path.join(pluginDir(plugin), "docs");
}

async function ensureDirs(plugin: string) {
  await fs.mkdir(docsDir(plugin), { recursive: true });
}

function safeSlug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export async function upsertDocument(args: {
  plugin: string;
  fileName: string;
  text: string;
  chunkSize?: number;
  overlap?: number;
}): Promise<StoredDocument> {
  const plugin = safeSlug(args.plugin);
  await ensureDirs(plugin);

  const documentId = crypto.createHash("sha256").update(`${args.fileName}:${args.text}`).digest("hex").slice(0, 24);
  const chunks = chunkText({ text: args.text, chunkSize: args.chunkSize, overlap: args.overlap });

  const storedChunks: StoredChunk[] = [];
  for (const c of chunks) {
    const embedding = await embedText(c.content);
    storedChunks.push({
      chunkId: c.chunkId,
      content: c.content,
      embedding,
      page: c.page ?? null,
      section: c.section ?? null
    });
  }

  const doc: StoredDocument = {
    documentId,
    plugin,
    fileName: args.fileName,
    createdAt: new Date().toISOString(),
    chunks: storedChunks
  };

  await fs.writeFile(path.join(docsDir(plugin), `${documentId}.json`), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

export async function listDocuments(plugin: string): Promise<Array<Pick<StoredDocument, "documentId" | "fileName" | "createdAt">>> {
  const p = safeSlug(plugin);
  await ensureDirs(p);
  const files = await fs.readdir(docsDir(p));
  const docs: Array<Pick<StoredDocument, "documentId" | "fileName" | "createdAt">> = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(docsDir(p), f), "utf8");
    const parsed = JSON.parse(raw) as StoredDocument;
    docs.push({ documentId: parsed.documentId, fileName: parsed.fileName, createdAt: parsed.createdAt });
  }
  return docs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function loadAllChunks(plugin: string): Promise<Array<StoredChunk & { documentId: string; fileName: string }>> {
  const p = safeSlug(plugin);
  await ensureDirs(p);
  const files = await fs.readdir(docsDir(p));
  const chunks: Array<StoredChunk & { documentId: string; fileName: string }> = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(docsDir(p), f), "utf8");
    const parsed = JSON.parse(raw) as StoredDocument;
    for (const c of parsed.chunks) {
      chunks.push({ ...c, documentId: parsed.documentId, fileName: parsed.fileName });
    }
  }
  return chunks;
}
