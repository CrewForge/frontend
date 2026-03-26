export type ExperimentManifestEntry = {
  id: string;
  experimentId: string;
  systemType: string;
  envType: "chess" | "evalplus" | string;
  metaModel: string | null;
  crewModel: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  totalTokens: number | null;
  totalMoves: number;
  result: unknown;
  path: string;
};

export type ExperimentsManifest = {
  generatedAt: string;
  source: string;
  totalDatasets: number;
  entries: ExperimentManifestEntry[];
};

export type ToolCall = {
  name?: string;
  arguments?: Record<string, unknown>;
};

export type ChatCallRecord = {
  latency_ms?: number;
  timestamp?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  response?: string;
  raw_response?: string;
  caller_id?: string;
  caller_name?: string;
  call_type?: string;
  cycle?: number;
  error?: string | null;
  tool_calls?: ToolCall[];
};

export type SystemMoveRecordDict = {
  calls?: ChatCallRecord[];
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  total_latency_ms?: number;
  call_count?: number;
};

export type ExperimentMove = {
  turn: number;
  player: string;
  action: string;
  env_state?: Record<string, unknown>;
  system_move_record?: SystemMoveRecordDict;
  timestamp?: string;
  latency_ms?: number;
  task_label?: string;
};

export type ExperimentDataset = {
  metadata?: {
    experiment_id?: string;
    record_id?: string;
    started_at?: string;
    ended_at?: string;
    system_type?: string;
    env_type?: string;
  };
  config?: {
    experiment_id?: string;
    system_type?: string;
    meta_model_name?: string | null;
    crew_model_name?: string | null;
    env_type?: string;
  };
  result?: unknown;
  winner?: string;
  total_tokens?: number;
  total_moves?: number;
  moves?: ExperimentMove[];
};

export type InteractionEventKind = "talk" | "common_space" | "tool" | "error";

export type InteractionEvent = {
  id: string;
  t: number;
  turn: number;
  cycle: number;
  from: string;
  to: string;
  kind: InteractionEventKind;
  text: string;
  tokens?: number;
  latencyMs?: number;
  error?: string | null;
};

export type InteractionGraphNode = {
  id: string;
  label: string;
  role?: string;
  messageCount: number;
};

export type InteractionGraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  kinds: Record<InteractionEventKind, number>;
  samples: InteractionEvent[];
  lastTimestamp: number;
};

export type InteractionGraphData = {
  nodes: InteractionGraphNode[];
  edges: InteractionGraphEdge[];
};
