export type PraxisQueryRequest = {
  plugin: string;
  query: string;
  stream?: boolean;
  parameters?: Record<string, string>;
};

export type PraxisCitation = {
  document: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string | null;
  score?: number;
};

export type PraxisQueryResponse = {
  answer: string;
  citations: PraxisCitation[];
  decisionPath: Array<{ step: number; node: string; label: string; result: string }>;
  confidence: "low" | "medium" | "high";
};

export type PraxisCollaborationRequest = {
  query: string;
  experts: string[];
  mode: "debate" | "consensus" | "review";
  maxRounds?: number;
};

export type PraxisCollaborationResponse = {
  mode: string;
  rounds: Array<{
    expert: string;
    response: string;
    round: number;
  }>;
  consensus?: string;
  finalAnswer: string;
  citations: PraxisCitation[];
};

export type PraxisDocument = {
  documentId: string;
  fileName: string;
  fileType: string;
  createdAt: string;
};

export type PraxisUploadResponse = {
  ok: boolean;
  documentId: string;
  chunks: number;
};
