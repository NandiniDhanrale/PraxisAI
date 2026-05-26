export function hallucinationGuard(input: {
  answer: string;
  citations: Array<{
    document: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
  }>;
}) {
  if (input.citations.length === 0) {
    return {
      answer: "Refusing to answer: no verifiable sources were found in the knowledge base.",
      citations: []
    };
  }
  return input;
}

