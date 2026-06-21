import { embedText } from "./embedding";
import { retrieveChunks } from "./retrieval";
import { loadDecisionTree } from "./knowledge-store";
import type { QueryPipelineOutput } from "./query-pipeline";

export type CollaborationMode = "debate" | "consensus" | "review";

export type ExpertResponse = {
  expert: string;
  response: string;
  round: number;
  citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
  }>;
};

export type CollaborationResult = {
  mode: CollaborationMode;
  rounds: ExpertResponse[];
  consensus?: string;
  finalAnswer: string;
  citations: QueryPipelineOutput["citations"];
};

export async function runCollaboration(args: {
  query: string;
  experts: string[];
  mode: CollaborationMode;
  maxRounds?: number;
}): Promise<CollaborationResult> {
  const maxRounds = args.maxRounds ?? 3;

  switch (args.mode) {
    case "debate":
      return runDebate(args.query, args.experts, maxRounds);
    case "consensus":
      return runConsensus(args.query, args.experts);
    case "review":
      return runReview(args.query, args.experts);
    default:
      return runConsensus(args.query, args.experts);
  }
}

async function runDebate(query: string, experts: string[], maxRounds: number): Promise<CollaborationResult> {
  const allRounds: ExpertResponse[] = [];

  for (let round = 1; round <= maxRounds; round++) {
    for (const expert of experts) {
      const response = await getExpertResponse(expert, query, allRounds, round);
      allRounds.push({
        expert,
        response: response.answer,
        round,
        citations: response.citations
      });
    }
  }

  const lastRound = allRounds.filter((r) => r.round === maxRounds);
  const consensus = lastRound.map((r) => `**${r.expert}**: ${r.response}`).join("\n\n");

  return {
    mode: "debate",
    rounds: allRounds,
    consensus,
    finalAnswer: consensus,
    citations: lastRound.flatMap((r) => r.citations).slice(0, 5)
  };
}

async function runConsensus(query: string, experts: string[]): Promise<CollaborationResult> {
  const responses: ExpertResponse[] = [];

  for (const expert of experts) {
    const response = await getExpertResponse(expert, query, [], 1);
    responses.push({
      expert,
      response: response.answer,
      round: 1,
      citations: response.citations
    });
  }

  const allResponses = responses.map((r) => `**${r.expert}**: ${r.response}`).join("\n\n");
  const consensus = `Based on consensus from ${experts.length} expert(s):\n\n${allResponses}`;

  return {
    mode: "consensus",
    rounds: responses,
    consensus,
    finalAnswer: consensus,
    citations: responses.flatMap((r) => r.citations).slice(0, 5)
  };
}

async function runReview(query: string, experts: string[]): Promise<CollaborationResult> {
  if (experts.length === 0) {
    return {
      mode: "review",
      rounds: [],
      finalAnswer: "No experts configured for review.",
      citations: []
    };
  }

  const leadExpert = experts[0];
  const leadResponse = await getExpertResponse(leadExpert, query, [], 1);

  const critiques: ExpertResponse[] = [];
  for (let i = 1; i < experts.length; i++) {
    const critic = experts[i];
    const critique = await getExpertResponse(critic, `${query}\n\nPlease critique this response:\n${leadResponse.answer}`, [], 1);
    critiques.push({
      expert: critic,
      response: critique.answer,
      round: 1,
      citations: critique.citations
    });
  }

  const review = [
    `**Lead Expert (${leadExpert})**:\n${leadResponse.answer}`,
    ...critiques.map((c) => `**Reviewer (${c.expert})**:\n${c.response}`)
  ].join("\n\n");

  return {
    mode: "review",
    rounds: [{ expert: leadExpert, response: leadResponse.answer, round: 1, citations: leadResponse.citations }, ...critiques],
    finalAnswer: review,
    citations: [leadResponse.citations, ...critiques.map((c) => c.citations)].flat().slice(0, 5)
  };
}

async function getExpertResponse(
  expertSlug: string,
  query: string,
  previousResponses: ExpertResponse[],
  round: number
): Promise<{ answer: string; citations: QueryPipelineOutput["citations"] }> {
  const queryEmbedding = await embedText(query);
  const retrieved = await retrieveChunks({ plugin: expertSlug, queryEmbedding, topK: 3 });

  const contextChunks = retrieved.chunks.map((c, i) => `[Source ${i + 1}]: ${c.content}`).join("\n\n");

  const history = previousResponses.length > 0
    ? `\n\nPrevious round responses:\n${previousResponses.map((r) => `${r.expert}: ${r.response}`).join("\n")}`
    : "";

  const key = process.env.OPENAI_API_KEY;
  if (key && contextChunks.length > 0) {
    try {
      const OpenAI = (await import("openai")).default as any;
      const client = new OpenAI({ apiKey: key });

      const systemPrompt = `You are expert "${expertSlug}". Answer based ONLY on the provided context. Cite sources using [Source N]. Be concise and authoritative.`;

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${contextChunks}${history}\n\nQuestion: ${query}` }
        ],
        temperature: 0.3,
        max_tokens: 512
      });

      const answer = completion.choices?.[0]?.message?.content ?? "No response generated.";
      return { answer, citations: retrieved.chunks.map((c) => ({ document: c.document, page: c.page, section: c.section, excerpt: c.content.slice(0, 200) })) };
    } catch {
      // Fall through to fallback
    }
  }

  const answer = retrieved.chunks.length > 0
    ? `Based on the knowledge base for "${expertSlug}": ${retrieved.chunks[0].content.slice(0, 300)}`
    : `The "${expertSlug}" expert has no knowledge base documents. Please upload documents first.`;

  return {
    answer,
    citations: retrieved.chunks.map((c) => ({ document: c.document, page: c.page, section: c.section, excerpt: c.content.slice(0, 200) }))
  };
}
