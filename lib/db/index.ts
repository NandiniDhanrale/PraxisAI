import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

let cached: ReturnType<typeof drizzle> | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "";
}

export function getDb() {
  if (cached) return cached;
  const url = getDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false });
  cached = drizzle(client);
  return cached;
}

