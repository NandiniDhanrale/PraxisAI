import type { PraxisQueryRequest, PraxisQueryResponse } from "./types";

export type PraxisClientOptions = {
  baseUrl: string;
  apiKey?: string;
};

export class PraxisClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(opts: PraxisClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
  }

  private headers(extra?: Record<string, string>) {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      ...extra
    };
  }

  async query(req: PraxisQueryRequest): Promise<PraxisQueryResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PraxisAI query failed (${res.status}): ${text}`);
    }
    return (await res.json()) as PraxisQueryResponse;
  }

  async queryStream(
    req: Omit<PraxisQueryRequest, "stream">,
    handlers: {
      onMeta?: (meta: unknown) => void;
      onToken?: (delta: { text: string; metrics?: Record<string, unknown> }) => void;
      onFinal?: (final: PraxisQueryResponse) => void;
      onError?: (err: { message: string }) => void;
    }
  ) {
    const res = await fetch(`${this.baseUrl}/api/v1/query`, {
      method: "POST",
      headers: this.headers({ accept: "text/event-stream" }),
      body: JSON.stringify({ ...req, stream: true })
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`PraxisAI queryStream failed (${res.status}): ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    const emitEvent = (rawEvent: string | undefined, rawData: string) => {
      const evt = (rawEvent ?? "message").trim();
      const dataStr = rawData.trim();
      if (!dataStr) return;
      const parsed = JSON.parse(dataStr) as any;
      if (evt === "meta") handlers.onMeta?.(parsed);
      else if (evt === "token") handlers.onToken?.(parsed);
      else if (evt === "final") handlers.onFinal?.(parsed as PraxisQueryResponse);
      else if (evt === "error") handlers.onError?.(parsed);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      while (true) {
        const idx = buf.indexOf("\n\n");
        if (idx === -1) break;
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);

        const lines = frame.split("\n");
        let evt: string | undefined;
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) evt = line.slice("event:".length).trim();
          if (line.startsWith("data:")) data += line.slice("data:".length).trim();
        }
        emitEvent(evt, data);
      }
    }
  }

  async collaborate(req: {
    query: string;
    experts: string[];
    mode: "debate" | "consensus" | "review";
    maxRounds?: number;
  }) {
    const res = await fetch(`${this.baseUrl}/api/v1/collaborate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PraxisAI collaborate failed (${res.status}): ${text}`);
    }
    return await res.json();
  }

  async uploadDocument(plugin: string, fileName: string, text: string) {
    const res = await fetch(`${this.baseUrl}/api/plugins/${encodeURIComponent(plugin)}/documents`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ fileName, text })
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`PraxisAI uploadDocument failed (${res.status}): ${err}`);
    }
    return await res.json();
  }

  async listDocuments(plugin: string) {
    const res = await fetch(`${this.baseUrl}/api/plugins/${encodeURIComponent(plugin)}/documents`, {
      headers: this.headers()
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`PraxisAI listDocuments failed (${res.status}): ${err}`);
    }
    return await res.json();
  }
}

export * from "./types";
