import { embedText } from "./embedding";
import { retrieveChunks } from "./retrieval";
import { runDecisionTree } from "./decision-tree";
import { mapCitations } from "./citation";
import { hallucinationGuard } from "./hallucination-guard";

export type QueryPipelineInput = {
  plugin: string;
  query: string;
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
      : `(${input.plugin}) Placeholder answer based on ${retrieved.chunks.length} retrieved chunk(s). [Source 1]`;

  const mapped = mapCitations(draftAnswer, retrieved.chunks);
  const guarded = hallucinationGuard(mapped);

  return {
    answer: guarded.answer,
    citations: guarded.citations,
    decisionPath: decision.decisionPath,
    confidence: guarded.citations.length > 0 ? "medium" : "low"
  };
}

