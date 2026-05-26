export type PraxisQueryRequest = {
  plugin: string;
  query: string;
  stream?: boolean;
};

export type PraxisCitation = {
  document: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string | null;
};

export type PraxisQueryResponse = {
  answer: string;
  citations: PraxisCitation[];
  decisionPath: Array<{ step: number; node: string; label: string; result: string }>;
  confidence: "low" | "medium" | "high";
};
