import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { saveApiKey, listApiKeys } from "@/lib/engine/knowledge-store";

export const runtime = "nodejs";

const CreateKeySchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1)
});

function generateApiKey(): string {
  const prefix = "pxai";
  const random = crypto.randomBytes(32).toString("hex");
  return `${prefix}_${random}`;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function encryptKey(key: string): string {
  const secret = process.env.ENCRYPTION_KEY ?? "default-dev-key-change-in-production!";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(secret.padEnd(32, "0").slice(0, 32)), iv);
  let encrypted = cipher.update(key, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  const keys = await listApiKeys(userId);
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateKeySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const keyEncrypted = encryptKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  await saveApiKey({
    id: crypto.randomUUID(),
    userId: parsed.data.userId,
    name: parsed.data.name,
    keyHash,
    keyPrefix,
    keyEncrypted,
    isActive: true,
    createdAt: new Date().toISOString()
  });

  return NextResponse.json({
    ok: true,
    key: rawKey,
    keyPrefix,
    name: parsed.data.name,
    message: "Save this key securely. It will not be shown again."
  });
}
