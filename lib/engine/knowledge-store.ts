import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { embedText } from "./embedding";
import { chunkText } from "./chunker";
import type { TreeData } from "./decision-tree";

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
  fileType: string;
  createdAt: string;
  chunks: StoredChunk[];
};

export type StoredApiKey = {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  keyEncrypted: string;
  isActive: boolean;
  createdAt: string;
};

export type StoredQueryLog = {
  id: string;
  pluginId: string;
  query: string;
  response: string;
  citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
  }>;
  confidence: string;
  latencyMs: number;
  createdAt: string;
};

function dataDir() {
  return path.join(process.cwd(), "data");
}

function pluginDir(plugin: string) {
  return path.join(dataDir(), "plugins", safeSlug(plugin));
}

function docsDir(plugin: string) {
  return path.join(pluginDir(plugin), "docs");
}

function treeFile(plugin: string) {
  return path.join(pluginDir(plugin), "tree.json");
}

function logsDir() {
  return path.join(dataDir(), "logs");
}

function keysDir() {
  return path.join(dataDir(), "keys");
}

async function ensureDirs(dirs: string[]) {
  for (const d of dirs) {
    await fs.mkdir(d, { recursive: true });
  }
}

export function safeSlug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export async function upsertDocument(args: {
  plugin: string;
  fileName: string;
  text: string;
  chunkSize?: number;
  overlap?: number;
  fileType?: string;
}): Promise<StoredDocument> {
  const plugin = safeSlug(args.plugin);
  await ensureDirs([docsDir(plugin)]);

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
    fileType: args.fileType ?? "text",
    createdAt: new Date().toISOString(),
    chunks: storedChunks
  };

  await fs.writeFile(path.join(docsDir(plugin), `${documentId}.json`), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

export async function deleteDocument(plugin: string, documentId: string): Promise<boolean> {
  const p = safeSlug(plugin);
  const filePath = path.join(docsDir(p), `${documentId}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listDocuments(plugin: string): Promise<Array<Pick<StoredDocument, "documentId" | "fileName" | "fileType" | "createdAt">>> {
  const p = safeSlug(plugin);
  await ensureDirs([docsDir(p)]);
  try {
    const files = await fs.readdir(docsDir(p));
    const docs: Array<Pick<StoredDocument, "documentId" | "fileName" | "fileType" | "createdAt">> = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(docsDir(p), f), "utf8");
      const parsed = JSON.parse(raw) as StoredDocument;
      docs.push({ documentId: parsed.documentId, fileName: parsed.fileName, fileType: parsed.fileType ?? "text", createdAt: parsed.createdAt });
    }
    return docs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function loadAllChunks(plugin: string): Promise<Array<StoredChunk & { documentId: string; fileName: string }>> {
  const p = safeSlug(plugin);
  await ensureDirs([docsDir(p)]);
  try {
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
  } catch {
    return [];
  }
}

export async function saveDecisionTree(plugin: string, treeData: TreeData): Promise<void> {
  const p = safeSlug(plugin);
  await ensureDirs([pluginDir(p)]);
  await fs.writeFile(treeFile(p), JSON.stringify(treeData, null, 2), "utf8");
}

export async function loadDecisionTree(plugin: string): Promise<TreeData | null> {
  const p = safeSlug(plugin);
  try {
    const raw = await fs.readFile(treeFile(p), "utf8");
    return JSON.parse(raw) as TreeData;
  } catch {
    return null;
  }
}

export async function logQuery(entry: Omit<StoredQueryLog, "id" | "createdAt">): Promise<void> {
  await ensureDirs([logsDir()]);
  const log: StoredQueryLog = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  const filePath = path.join(logsDir(), `${log.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(log, null, 2), "utf8");
}

export async function getQueryLogs(plugin?: string, limit = 50): Promise<StoredQueryLog[]> {
  await ensureDirs([logsDir()]);
  try {
    const files = await fs.readdir(logsDir());
    const logs: StoredQueryLog[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(logsDir(), f), "utf8");
      const parsed = JSON.parse(raw) as StoredQueryLog;
      if (!plugin || parsed.pluginId === plugin) {
        logs.push(parsed);
      }
    }
    return logs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function saveApiKey(key: StoredApiKey): Promise<void> {
  await ensureDirs([keysDir()]);
  const filePath = path.join(keysDir(), `${key.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(key, null, 2), "utf8");
}

export async function listApiKeys(userId: string): Promise<Array<Omit<StoredApiKey, "keyEncrypted" | "keyHash">>> {
  await ensureDirs([keysDir()]);
  try {
    const files = await fs.readdir(keysDir());
    const keys: Array<Omit<StoredApiKey, "keyEncrypted" | "keyHash">> = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(keysDir(), f), "utf8");
      const parsed = JSON.parse(raw) as StoredApiKey;
      if (parsed.userId === userId) {
        const { keyEncrypted, keyHash, ...safe } = parsed;
        keys.push(safe);
      }
    }
    return keys.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function validateApiKey(keyHash: string): Promise<StoredApiKey | null> {
  await ensureDirs([keysDir()]);
  try {
    const files = await fs.readdir(keysDir());
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(keysDir(), f), "utf8");
      const parsed = JSON.parse(raw) as StoredApiKey;
      if (parsed.keyHash === keyHash && parsed.isActive) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}
