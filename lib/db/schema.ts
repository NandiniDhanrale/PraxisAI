import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

export const schemaVersion = 1;

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const plugins = pgTable("plugins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  systemPrompt: text("system_prompt").notNull(),
  citationMode: text("citation_mode").default("strict").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluginId: uuid("plugin_id").notNull(),
  fileName: text("file_name").notNull(),
  rawText: text("raw_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull(),
  content: text("content").notNull(),
  embedding: vector1536("embedding").notNull(),
  page: integer("page"),
  section: text("section"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

