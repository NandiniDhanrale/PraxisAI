import type { PraxisClient } from "./index";

export type AutoGPTAction = {
  name: string;
  description: string;
  args: Record<string, unknown>;
};

export type AutoGPTResult = {
  success: boolean;
  output: string;
};

export class PraxisAutoGPTPlugin {
  private client: PraxisClient;

  constructor(client: PraxisClient) {
    this.client = client;
  }

  getActions(): AutoGPTAction[] {
    return [
      {
        name: "praxis_query",
        description: "Query a PraxisAI expert plugin to get cited, domain-specific answers.",
        args: {
          plugin: { type: "string", description: "The plugin slug to query" },
          query: { type: "string", description: "The question to ask" }
        }
      },
      {
        name: "praxis_list_documents",
        description: "List all knowledge documents in a PraxisAI plugin.",
        args: {
          plugin: { type: "string", description: "The plugin slug" }
        }
      },
      {
        name: "praxis_upload_document",
        description: "Upload a text document to a PraxisAI plugin's knowledge base.",
        args: {
          plugin: { type: "string", description: "The plugin slug" },
          fileName: { type: "string", description: "Name of the file" },
          text: { type: "string", description: "Content of the document" }
        }
      }
    ];
  }

  async execute(action: string, args: Record<string, unknown>): Promise<AutoGPTResult> {
    try {
      switch (action) {
        case "praxis_query": {
          const result = await this.client.query({
            plugin: args.plugin as string,
            query: args.query as string
          });
          return {
            success: true,
            output: `${result.answer}\n\nCitations:\n${result.citations
              .map((c) => `- ${c.document}${c.page ? `, p.${c.page}` : ""}`)
              .join("\n")}`
          };
        }
        case "praxis_list_documents": {
          const result = await this.client.listDocuments(args.plugin as string);
          const docs = result.documents ?? [];
          return {
            success: true,
            output: docs.length > 0
              ? docs.map((d: any) => `- ${d.fileName} (${d.fileType})`).join("\n")
              : "No documents found."
          };
        }
        case "praxis_upload_document": {
          const result = await this.client.uploadDocument(
            args.plugin as string,
            args.fileName as string,
            args.text as string
          );
          return {
            success: true,
            output: `Document uploaded. ID: ${result.documentId}, Chunks: ${result.chunks}`
          };
        }
        default:
          return { success: false, output: `Unknown action: ${action}` };
      }
    } catch (err) {
      return {
        success: false,
        output: `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      };
    }
  }
}

export function createPraxisAutoGPTPlugin(client: PraxisClient): PraxisAutoGPTPlugin {
  return new PraxisAutoGPTPlugin(client);
}
