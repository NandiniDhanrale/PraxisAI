import type { LexicQueryRequest, LexicQueryResponse } from "./types";

export type LexicClientOptions = {
  baseUrl: string;
  apiKey?: string;
};

export class LexicClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(opts: LexicClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
  }

  async query(req: LexicQueryRequest): Promise<LexicQueryResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/query`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Lexic query failed (${res.status}): ${text}`);
    }
    return (await res.json()) as LexicQueryResponse;
  }

  async queryStream(
    req: Omit<LexicQueryRequest, "stream">,
    handlers: {
      onMeta?: (meta: unknown) => void;
      onToken?: (delta: { text: string; metrics?: Record<string, unknown> }) => void;
      onFinal?: (final: LexicQueryResponse) => void;
      onError?: (err: { message: string }) => void;
    }
  ) {
    const res = await fetch(`${this.baseUrl}/api/v1/query`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({ ...req, stream: true })
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`Lexic queryStream failed (${res.status}): ${text}`);
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
      else if (evt === "final") handlers.onFinal?.(parsed as LexicQueryResponse);
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
}

export * from "./types";
