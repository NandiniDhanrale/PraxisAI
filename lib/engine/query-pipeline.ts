import { embedText } from "./embedding";
import { retrieveChunks } from "./retrieval";
import { runDecisionTree } from "./decision-tree";
import { mapCitations } from "./citation";
import { hallucinationGuard } from "./hallucination-guard";
import { logQuery } from "./knowledge-store";

export type QueryPipelineInput = {
  plugin: string;
  query: string;
  parameters?: Record<string, string>;
  onToken?: (delta: { text: string; metrics?: Record<string, unknown> }) => void;
};

export type QueryPipelineOutput = {
  answer: string;
  citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
    score?: number;
  }>;
  decisionPath: Array<{ step: number; node: string; label: string; result: string }>;
  confidence: "low" | "medium" | "high";
};

export async function runQueryPipeline(input: QueryPipelineInput): Promise<QueryPipelineOutput> {
  const startTime = Date.now();

  const queryEmbedding = await embedText(input.query);
  const retrieved = await retrieveChunks({ plugin: input.plugin, queryEmbedding });
  const decision = await runDecisionTree({ plugin: input.plugin, query: input.query, parameters: input.parameters });

  const contextChunks = retrieved.chunks.map((c, i) => `[Source ${i + 1}]: ${c.content}`).join("\n\n");

  let answer: string;

  const key = process.env.OPENAI_API_KEY;
  if (key && contextChunks.length > 0) {
    try {
      const OpenAI = (await import("openai")).default as any;
      const client = new OpenAI({ apiKey: key });

      const systemPrompt = `You are a helpful expert assistant. Answer the user's question based ONLY on the provided context. 
Cite your sources using [Source N] notation where N is the source number.
If the context does not contain enough information to answer, say so clearly.
Be concise and accurate. Do not make up information.`;

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${contextChunks}\n\nQuestion: ${input.query}` }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        stream: true
      });

      answer = "";
      for await (const chunk of completion) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          answer += delta;
          input.onToken?.({ text: delta });
        }
      }
    } catch {
      answer = generateFallbackAnswer(input.plugin, input.query, retrieved.chunks);
    }
  } else {
    answer = generateFallbackAnswer(input.plugin, input.query, retrieved.chunks);
    if (input.onToken) {
      const tokens = answer.split(/(\s+)/).filter((t) => t.length > 0);
      for (const t of tokens) {
        input.onToken({ text: t });
      }
    }
  }

  const mapped = mapCitations(answer, retrieved.chunks);
  const guarded = hallucinationGuard(mapped);

  const latencyMs = Date.now() - startTime;
  const confidence: "low" | "medium" | "high" =
    guarded.citations.length >= 3 ? "high" : guarded.citations.length >= 1 ? "medium" : "low";

  logQuery({
    pluginId: input.plugin,
    query: input.query,
    response: guarded.answer,
    citations: guarded.citations,
    confidence,
    latencyMs
  }).catch(() => {});

  return {
    answer: guarded.answer,
    citations: guarded.citations,
    decisionPath: decision.decisionPath,
    confidence
  };
}

function generateFallbackAnswer(plugin: string, query: string, chunks: Array<{ content: string; score: number }>): string {
  if (chunks.length === 0) {
    return `I don't have enough information in the "${plugin}" knowledge base to answer this question. Please upload relevant documents first.`;
  }

  const bestChunk = chunks[0];
  const relevance = bestChunk.score > 0.8 ? "highly relevant" : bestChunk.score > 0.5 ? "relevant" : "partially relevant";

  return `Based on the ${relevance} information in the "${plugin}" knowledge base:\n\n${bestChunk.content.slice(0, 500)}${bestChunk.content.length > 500 ? "..." : ""}\n\n[Source 1]`;
}
