import type { PraxisClient } from "./index";

export type LangChainRetrieverInput = {
  query: string;
};

export type LangChainDocument = {
  pageContent: string;
  metadata: Record<string, unknown>;
};

export class PraxisRetriever {
  private client: PraxisClient;
  private plugin: string;

  constructor(client: PraxisClient, plugin: string) {
    this.client = client;
    this.plugin = plugin;
  }

  async getRelevantDocuments(query: string): Promise<LangChainDocument[]> {
    const result = await this.client.query({ plugin: this.plugin, query });
    return result.citations.map((c) => ({
      pageContent: c.excerpt ?? "",
      metadata: {
        document: c.document,
        page: c.page,
        section: c.section
      }
    }));
  }

  async invoke(input: LangChainRetrieverInput): Promise<LangChainDocument[]> {
    return this.getRelevantDocuments(input.query);
  }
}

export class PraxisChain {
  private client: PraxisClient;
  private plugin: string;

  constructor(client: PraxisClient, plugin: string) {
    this.client = client;
    this.plugin = plugin;
  }

  async invoke(input: { input: string }): Promise<string> {
    const result = await this.client.query({ plugin: this.plugin, query: input.input });
    return result.answer;
  }

  async call(input: { input: string }): Promise<{ output: string }> {
    const output = await this.invoke(input);
    return { output };
  }
}

export function createPraxisRetriever(client: PraxisClient, plugin: string): PraxisRetriever {
  return new PraxisRetriever(client, plugin);
}

export function createPraxisChain(client: PraxisClient, plugin: string): PraxisChain {
  return new PraxisChain(client, plugin);
}
