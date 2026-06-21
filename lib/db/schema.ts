import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

export const schemaVersion = 2;

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    if (typeof value !== "string") return [];
    const trimmed = value.trim().replace(/^\[|\]$/g, "");
    if (!trimmed) return [];
    return trimmed.split(",").map((x) => Number(x));
  }
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const plugins = pgTable("plugins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  domain: text("domain"),
  systemPrompt: text("system_prompt").notNull(),
  citationMode: text("citation_mode").default("strict").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("plugins_user_id_idx").on(table.userId),
  index("plugins_slug_idx").on(table.slug)
]);

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluginId: uuid("plugin_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").default("text"),
  rawText: text("raw_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("knowledge_documents_plugin_id_idx").on(table.pluginId)
]);

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull(),
  content: text("content").notNull(),
  embedding: vector1536("embedding").notNull(),
  page: integer("page"),
  section: text("section"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("knowledge_chunks_document_id_idx").on(table.documentId)
]);

export const decisionTrees = pgTable("decision_trees", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluginId: uuid("plugin_id").notNull(),
  name: text("name").notNull(),
  treeData: jsonb("tree_data").notNull().$type<{
    nodes: Array<{
      id: string;
      type: "condition" | "question" | "action";
      label: string;
      config: Record<string, unknown>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("decision_trees_plugin_id_idx").on(table.pluginId)
]);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  keyEncrypted: text("key_encrypted").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("api_keys_user_id_idx").on(table.userId),
  index("api_keys_key_hash_idx").on(table.keyHash)
]);

export const queryLogs = pgTable("query_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluginId: uuid("plugin_id").notNull(),
  apiKeyId: uuid("api_key_id"),
  query: text("query").notNull(),
  response: text("response"),
  citations: jsonb("citations").$type<Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
  }>>(),
  decisionPath: jsonb("decision_path").$type<Array<{
    step: number;
    node: string;
    label: string;
    result: string;
  }>>(),
  confidence: text("confidence"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("query_logs_plugin_id_idx").on(table.pluginId),
  index("query_logs_created_at_idx").on(table.createdAt)
]);

export const collaborationRooms = pgTable("collaboration_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  expertSlugs: jsonb("expert_slugs").notNull().$type<string[]>(),
  mode: text("mode").notNull().$type<"debate" | "consensus" | "review">(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const collaborationSessions = pgTable("collaboration_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull(),
  query: text("query").notNull(),
  rounds: jsonb("rounds").$type<Array<{
    expert: string;
    response: string;
    round: number;
  }>>(),
  consensus: text("consensus"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
