/**
 * Shapes align with CrewForge `recording.RunnerMoveRecord.to_dict()` and `RunResult.to_dict()`
 * produced by `runner.run_game()` against `evalplus_env.EvalPlusEnv`.
 */

export type EvalPlusEnvState = {
  num_tasks: number;
  current_task_id: number;
  current_k: number;
};

export type ChatCallRecord = {
  latency_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  response?: string;
  raw_response?: string;
};

export type SystemMoveRecordDict = {
  calls?: ChatCallRecord[];
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  total_latency_ms?: number;
  call_count?: number;
};

export type EvalPlusRunnerMove = {
  turn: number;
  player: string;
  action: string;
  env_state: EvalPlusEnvState;
  system_move_record?: SystemMoveRecordDict;
  timestamp?: string;
  latency_ms?: number;
  /** Optional; demo / future backend field for dataset key, e.g. HumanEval/0 */
  task_label?: string;
};

export type EvalPlusPassAtK = Record<string, number>;

export type EvalPlusRunResult = {
  game_id?: string;
  system_name?: string;
  environment_name?: string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  result?: { pass_at_k?: EvalPlusPassAtK };
  moves?: EvalPlusRunnerMove[];
  total_turns?: number;
  config?: Record<string, unknown>;
  error?: string | null;
};

export function extractPassAtK(r: EvalPlusRunResult | undefined): EvalPlusPassAtK | null {
  const pk = r?.result?.pass_at_k;
  if (!pk || typeof pk !== 'object') return null;
  return pk;
}

export function movesFromPayload(raw: unknown): EvalPlusRunnerMove[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.moves)) {
    return o.moves.filter(isRunnerMove);
  }
  return [];
}

function isRunnerMove(x: unknown): x is EvalPlusRunnerMove {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.turn === 'number' &&
    typeof m.action === 'string' &&
    typeof m.player === 'string' &&
    isEnvState(m.env_state)
  );
}

function isEnvState(x: unknown): x is EvalPlusEnvState {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.num_tasks === 'number' &&
    typeof e.current_task_id === 'number' &&
    typeof e.current_k === 'number'
  );
}

/** After move n, `num_tasks` counts completed submissions; derive a display index for the last submission. */
export function completedTaskOrdinal(env: EvalPlusEnvState): number {
  return Math.max(0, env.num_tasks - 1);
}
