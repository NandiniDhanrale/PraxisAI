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
  const retrieved = await retrieveChunks({ plugin: input.plugin, queryEmbedding, query: input.query });
  const decision = await runDecisionTree({ plugin: input.plugin, query: input.query, parameters: input.parameters });

  const contextChunks = retrieved.chunks.map((c, i) => `[Source ${i + 1}] (${c.document}):\n${c.content}`).join("\n\n---\n\n");

  let answer: string;

  const key = process.env.OPENAI_API_KEY;
  if (key && contextChunks.length > 0) {
    try {
      const OpenAI = (await import("openai")).default as any;
      const client = new OpenAI({ apiKey: key });

      const systemPrompt = `You are a knowledgeable expert assistant powered by PraxisAI. Your job is to answer questions accurately using ONLY the provided source documents.

Rules:
1. Base your answer ONLY on the provided context. Do not use outside knowledge.
2. Cite your sources using [Source N] notation where N matches the source number.
3. If multiple sources are relevant, synthesize information from all of them.
4. If the context doesn't contain enough information, clearly state what's missing.
5. Be thorough but concise. Provide specific details, numbers, and facts from the sources.
6. If asked to summarize, provide a comprehensive overview of all relevant points.`;

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Source Documents:\n\n${contextChunks}\n\n---\n\nQuestion: ${input.query}\n\nPlease provide a comprehensive answer based on the sources above:` }
        ],
        temperature: 0.3,
        max_tokens: 1500,
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
    } catch (err) {
      answer = generateSmartAnswer(input.plugin, input.query, retrieved.chunks);
      streamFallback(answer, input.onToken);
    }
  } else {
    answer = generateSmartAnswer(input.plugin, input.query, retrieved.chunks);
    streamFallback(answer, input.onToken);
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

function generateSmartAnswer(
  plugin: string,
  query: string,
  chunks: Array<{ content: string; document: string; score: number }>
): string {
  if (chunks.length === 0) {
    return `I couldn't find relevant information in the "${plugin}" knowledge base for your question: "${query}"\n\nTo get an answer, please upload documents containing the information you're looking for.`;
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  // Find the most relevant chunks and extract key sentences
  const relevantSentences: string[] = [];
  const usedSources = new Set<number>();

  for (let i = 0; i < chunks.length && relevantSentences.length < 8; i++) {
    const chunk = chunks[i];
    const sentences = chunk.content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const relevance = queryWords.filter((w) => sentenceLower.includes(w)).length;
      if (relevance > 0) {
        relevantSentences.push(sentence.trim());
        usedSources.add(i + 1);
      }
    }
  }

  if (relevantSentences.length === 0) {
    // No keyword matches, just return the best chunk content
    const bestChunk = chunks[0];
    return `Based on the "${plugin}" knowledge base, here is the most relevant information I found:\n\n${bestChunk.content.slice(0, 800)}${bestChunk.content.length > 800 ? "..." : ""}\n\n[Source 1]`;
  }

  const answer = relevantSentences
    .slice(0, 6)
    .map((s) => s.endsWith(".") ? s : s + ".")
    .join(" ");

  const sourceRefs = [...usedSources].map((n) => `[Source ${n}]`).join(" ");

  return `${answer}\n\n${sourceRefs}`;
}

function streamFallback(answer: string, onToken?: (delta: { text: string }) => void) {
  if (!onToken) return;
  // Split into natural chunks for streaming feel
  const sentences = answer.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    onToken({ text: sentence + " " });
  }
}
