export type PipeErrorKind =
  | "invalid_request"
  | "database"
  | "moss_config"
  | "moss_retrieval"
  | "llm_config"
  | "llm_request"
  | "llm_malformed"
  | "internal";

export class PipeError extends Error {
  readonly kind: PipeErrorKind;
  readonly status: number;

  constructor(kind: PipeErrorKind, status: number, message: string) {
    super(message);
    this.name = "PipeError";
    this.kind = kind;
    this.status = status;
  }
}

export interface Evidence {
  id: string;
  type: string;
  assetId: string;
  score: number;
  snippet: string;
  plantId?: string;
  severity?: string;
  category?: string;
  date?: string;
}

export interface RetrievalInfo {
  provider: "moss";
  indexName: string;
  latencyMs: number | null;
  documents: number;
  query: string;
}

export interface InvestigateResult {
  answer: string;
  evidence: Evidence[];
  retrieval: RetrievalInfo;
  model?: string;
  latency: {
    llmMs: number;
    totalMs: number;
  };
}

export interface ApiError {
  error: {
    kind: PipeErrorKind;
    message: string;
  };
}

export interface PlantSummary {
  id: string;
  code: string;
  name: string;
  location: string | null;
}

export interface AssetSummary {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
  plant: PlantSummary;
  incidentCount: number;
  maintenanceCount: number;
  workOrderCount: number;
  sopCount: number;
}

export type InvestigationPhase = "idle" | "loading" | "success" | "error";