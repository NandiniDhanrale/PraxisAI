import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const CreatePluginSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-_]+$/),
  domain: z.string().optional(),
  systemPrompt: z.string().min(1),
  citationMode: z.string().optional()
});

type PluginRecord = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  domain: string;
  systemPrompt: string;
  citationMode: string;
  createdAt: string;
};

function pluginsFile() {
  return path.join(process.cwd(), "data", "plugins.json");
}

async function loadPlugins(): Promise<PluginRecord[]> {
  try {
    const raw = await fs.readFile(pluginsFile(), "utf8");
    return JSON.parse(raw) as PluginRecord[];
  } catch {
    return [];
  }
}

async function savePlugins(plugins: PluginRecord[]) {
  const dir = path.join(process.cwd(), "data");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(pluginsFile(), JSON.stringify(plugins, null, 2), "utf8");
}

export async function GET() {
  const plugins = await loadPlugins();
  return NextResponse.json({ plugins });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreatePluginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const plugins = await loadPlugins();
  if (plugins.some((p) => p.slug === parsed.data.slug)) {
    return NextResponse.json({ error: "Plugin slug already exists" }, { status: 409 });
  }

  const plugin: PluginRecord = {
    id: crypto.randomUUID(),
    userId: parsed.data.userId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    domain: parsed.data.domain ?? "",
    systemPrompt: parsed.data.systemPrompt,
    citationMode: parsed.data.citationMode ?? "strict",
    createdAt: new Date().toISOString()
  };

  plugins.push(plugin);
  await savePlugins(plugins);

  return NextResponse.json({ ok: true, id: plugin.id, slug: plugin.slug });
}
