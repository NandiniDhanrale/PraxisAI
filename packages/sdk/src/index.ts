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
}

export * from "./types";

