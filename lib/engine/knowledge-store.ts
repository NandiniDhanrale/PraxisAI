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

// In-memory store that persists across requests within the same serverless instance
// Falls back to filesystem for persistence when available
const memoryStore = {
  documents: new Map<string, StoredDocument[]>(),
  trees: new Map<string, TreeData>(),
  plugins: new Map<string, any[]>(),
  apiKeys: new Map<string, StoredApiKey[]>(),
  queryLogs: new Map<string, StoredQueryLog[]>()
};

function safeSlug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function docsKey(plugin: string) {
  return safeSlug(plugin);
}

// ---- Documents ----

export async function upsertDocument(args: {
  plugin: string;
  fileName: string;
  text: string;
  chunkSize?: number;
  overlap?: number;
  fileType?: string;
}): Promise<StoredDocument> {
  const plugin = safeSlug(args.plugin);
  const documentId = crypto.createHash("sha256").update(`${args.fileName}:${args.text}:${Date.now()}`).digest("hex").slice(0, 24);
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

  // Store in memory
  const existing = memoryStore.documents.get(plugin) ?? [];
  // Replace if same filename exists
  const filtered = existing.filter((d) => d.fileName !== args.fileName);
  filtered.push(doc);
  memoryStore.documents.set(plugin, filtered);

  // Also try filesystem for persistence
  try {
    const dir = path.join(process.cwd(), "data", "plugins", plugin, "docs");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${documentId}.json`), JSON.stringify(doc, null, 2), "utf8");
  } catch {}

  return doc;
}

export async function deleteDocument(plugin: string, documentId: string): Promise<boolean> {
  const p = safeSlug(plugin);
  const existing = memoryStore.documents.get(p) ?? [];
  const filtered = existing.filter((d) => d.documentId !== documentId);
  memoryStore.documents.set(p, filtered);
  try {
    await fs.unlink(path.join(process.cwd(), "data", "plugins", p, "docs", `${documentId}.json`));
  } catch {}
  return true;
}

export async function listDocuments(plugin: string): Promise<Array<Pick<StoredDocument, "documentId" | "fileName" | "fileType" | "createdAt">>> {
  const p = docsKey(plugin);

  // Check memory first
  let docs = memoryStore.documents.get(p);
  if (docs && docs.length > 0) {
    return docs.map((d) => ({ documentId: d.documentId, fileName: d.fileName, fileType: d.fileType, createdAt: d.createdAt }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  // Try loading from filesystem
  try {
    const dir = path.join(process.cwd(), "data", "plugins", p, "docs");
    const files = await fs.readdir(dir);
    docs = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      const parsed = JSON.parse(raw) as StoredDocument;
      docs.push(parsed);
    }
    memoryStore.documents.set(p, docs);
    return docs.map((d) => ({ documentId: d.documentId, fileName: d.fileName, fileType: d.fileType, createdAt: d.createdAt }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function loadAllChunks(plugin: string): Promise<Array<StoredChunk & { documentId: string; fileName: string }>> {
  const p = docsKey(plugin);

  // Check memory first
  let docs = memoryStore.documents.get(p);
  if (!docs || docs.length === 0) {
    // Try loading from filesystem
    try {
      const dir = path.join(process.cwd(), "data", "plugins", p, "docs");
      const files = await fs.readdir(dir);
      docs = [];
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        const raw = await fs.readFile(path.join(dir, f), "utf8");
        docs.push(JSON.parse(raw) as StoredDocument);
      }
      memoryStore.documents.set(p, docs);
    } catch {
      return [];
    }
  }

  if (!docs) return [];

  const chunks: Array<StoredChunk & { documentId: string; fileName: string }> = [];
  for (const doc of docs) {
    for (const c of doc.chunks) {
      chunks.push({ ...c, documentId: doc.documentId, fileName: doc.fileName });
    }
  }
  return chunks;
}

// ---- Decision Trees ----

export async function saveDecisionTree(plugin: string, treeData: TreeData): Promise<void> {
  const p = safeSlug(plugin);
  memoryStore.trees.set(p, treeData);
  try {
    const dir = path.join(process.cwd(), "data", "plugins", p);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "tree.json"), JSON.stringify(treeData, null, 2), "utf8");
  } catch {}
}

export async function loadDecisionTree(plugin: string): Promise<TreeData | null> {
  const p = safeSlug(plugin);
  const mem = memoryStore.trees.get(p);
  if (mem) return mem;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "plugins", p, "tree.json"), "utf8");
    const tree = JSON.parse(raw) as TreeData;
    memoryStore.trees.set(p, tree);
    return tree;
  } catch {
    return null;
  }
}

// ---- Query Logs ----

export async function logQuery(entry: Omit<StoredQueryLog, "id" | "createdAt">): Promise<void> {
  const log: StoredQueryLog = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  const existing = memoryStore.queryLogs.get("global") ?? [];
  existing.unshift(log);
  if (existing.length > 200) existing.length = 200;
  memoryStore.queryLogs.set("global", existing);
}

export async function getQueryLogs(plugin?: string, limit = 50): Promise<StoredQueryLog[]> {
  const all = memoryStore.queryLogs.get("global") ?? [];
  const filtered = plugin ? all.filter((l) => l.pluginId === plugin) : all;
  return filtered.slice(0, limit);
}

// ---- API Keys ----

export async function saveApiKey(key: StoredApiKey): Promise<void> {
  const existing = memoryStore.apiKeys.get(key.userId) ?? [];
  existing.push(key);
  memoryStore.apiKeys.set(key.userId, existing);
}

export async function listApiKeys(userId: string): Promise<Array<Omit<StoredApiKey, "keyEncrypted" | "keyHash">>> {
  const keys = memoryStore.apiKeys.get(userId) ?? [];
  return keys.map(({ keyEncrypted, keyHash, ...safe }) => safe);
}

export async function validateApiKey(keyHash: string): Promise<StoredApiKey | null> {
  for (const keys of memoryStore.apiKeys.values()) {
    const found = keys.find((k) => k.keyHash === keyHash && k.isActive);
    if (found) return found;
  }
  return null;
}

// ---- Plugins ----

export async function savePlugin(plugin: any): Promise<void> {
  const existing = memoryStore.plugins.get(plugin.userId) ?? [];
  existing.push(plugin);
  memoryStore.plugins.set(plugin.userId, existing);
}

export async function listPlugins(userId: string): Promise<any[]> {
  return memoryStore.plugins.get(userId) ?? [];
}
