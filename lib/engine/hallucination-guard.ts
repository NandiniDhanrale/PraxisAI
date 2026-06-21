export type HallucinationGuardInput = {
  answer: string;
  citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
    score?: number;
  }>;
};

export function hallucinationGuard(input: HallucinationGuardInput): HallucinationGuardInput {
  if (input.citations.length === 0) {
    return {
      answer: "Refusing to answer: no verifiable sources were found in the knowledge base. Please upload relevant documents first.",
      citations: []
    };
  }

  const fakeCitationPattern = /\[Source\s+\d+\]/gi;
  const totalCitations = (input.answer.match(fakeCitationPattern) ?? []).length;

  if (totalCitations > 0 && input.citations.length === 0) {
    return {
      answer: "Refusing to answer: the response contains citations that cannot be verified against the knowledge base.",
      citations: []
    };
  }

  const uncertaintyPatterns = [
    /i(?:'m| am) not (?:sure|certain|confident)/i,
    /(?:maybe|perhaps|possibly|might be|could be)/i,
    /i (?:think|believe) (?:that )?(?:it|this|they)/i,
    /(?:don't|do not) (?:have|know|recall)/i
  ];

  const hasUncertainty = uncertaintyPatterns.some((p) => p.test(input.answer));
  if (hasUncertainty && input.citations.length < 2) {
    return {
      answer: "Refusing to answer: insufficient confidence in the response based on available sources.",
      citations: []
    };
  }

  return input;
}
