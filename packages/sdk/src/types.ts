export type LexicQueryRequest = {
  plugin: string;
  query: string;
  stream?: boolean;
};

export type LexicCitation = {
  document: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string | null;
};

export type LexicQueryResponse = {
  answer: string;
  citations: LexicCitation[];
  decisionPath: Array<{ step: number; node: string; label: string; result: string }>;
  confidence: "low" | "medium" | "high";
};

