import { embedText } from "./embedding";
import { retrieveChunks } from "./retrieval";
import { runDecisionTree } from "./decision-tree";
import { mapCitations } from "./citation";
import { hallucinationGuard } from "./hallucination-guard";

export type QueryPipelineInput = {
  plugin: string;
  query: string;
  onToken?: (delta: { text: string; metrics?: Record<string, unknown> }) => void;
};

export type QueryPipelineOutput = {
  answer: string;
  citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
  }>;
  decisionPath: Array<{ step: number; node: string; label: string; result: string }>;
  confidence: "low" | "medium" | "high";
};

export async function runQueryPipeline(input: QueryPipelineInput): Promise<QueryPipelineOutput> {
  const queryEmbedding = await embedText(input.query);
  const retrieved = await retrieveChunks({ plugin: input.plugin, queryEmbedding });
  const decision = await runDecisionTree({ plugin: input.plugin, query: input.query });

  const draftAnswer =
    retrieved.chunks.length === 0
      ? "I can’t answer this from the current knowledge base."
      : `(${input.plugin}) Answer synthesized from retrieved sources. [Source 1]`;

  if (input.onToken) {
    const tokens = draftAnswer.split(/(\s+)/).filter((t) => t.length > 0);
    for (const t of tokens) {
      input.onToken({ text: t });
    }
  }

  const mapped = mapCitations(draftAnswer, retrieved.chunks);
  const guarded = hallucinationGuard(mapped);

  return {
    answer: guarded.answer,
    citations: guarded.citations,
    decisionPath: decision.decisionPath,
    confidence: guarded.citations.length > 0 ? "medium" : "low"
  };
}
