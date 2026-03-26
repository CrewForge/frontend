import type {
  ChatCallRecord,
  ExperimentDataset,
  ExperimentMove,
  InteractionEvent,
  InteractionEventKind,
  InteractionGraphData,
  InteractionGraphEdge,
  InteractionGraphNode,
} from "./types";

type ExtractOptions = {
  turnRange?: [number, number] | null;
  cycleRange?: [number, number] | null;
};

const COMMON_SPACE_ID = "CommonSpace";

function inRange(value: number, range?: [number, number] | null) {
  if (!range) return true;
  return value >= range[0] && value <= range[1];
}

function normalizeText(input: unknown): string {
  if (typeof input === "string") return input;
  if (input == null) return "";
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function tsToMillis(ts?: string): number {
  if (!ts) return 0;
  const n = Date.parse(ts);
  return Number.isFinite(n) ? n : 0;
}

function callerName(call: ChatCallRecord): string {
  return call.caller_name?.trim() || call.caller_id?.trim() || "Unknown agent";
}

function inferRole(name: string): string | undefined {
  const n = name.toLowerCase();
  if (n.includes("meta")) return "meta";
  if (n.includes("integrator")) return "integrator";
  if (n.includes("analyst")) return "analyst";
  if (n.includes("specialist")) return "specialist";
  if (n.includes("agent")) return "agent";
  if (/[a-z]+_[a-z]+/i.test(name)) return "crew";
  return undefined;
}

function pushEvent(
  events: InteractionEvent[],
  base: Omit<InteractionEvent, "id">,
) {
  events.push({
    ...base,
    id: `${base.turn}-${base.cycle}-${base.from}-${base.to}-${events.length}`,
  });
}

export function extractInteractionEvents(
  dataset: ExperimentDataset,
  options: ExtractOptions = {},
): InteractionEvent[] {
  const moves = Array.isArray(dataset.moves) ? dataset.moves : [];
  const events: InteractionEvent[] = [];

  for (const move of moves) {
    const turn = typeof move.turn === "number" ? move.turn : 0;
    if (!inRange(turn, options.turnRange)) continue;
    const calls = move.system_move_record?.calls ?? [];
    for (const call of calls) {
      const cycle = typeof call.cycle === "number" ? call.cycle : 0;
      if (!inRange(cycle, options.cycleRange)) continue;
      const from = callerName(call);
      const t = tsToMillis(call.timestamp ?? move.timestamp);
      const tokens = (call.prompt_tokens ?? 0) + (call.completion_tokens ?? 0);
      const latencyMs = typeof call.latency_ms === "number" ? call.latency_ms : undefined;

      if (call.error) {
        pushEvent(events, {
          t,
          turn,
          cycle,
          from,
          to: from,
          kind: "error",
          text: call.error,
          tokens,
          latencyMs,
          error: call.error,
        });
      }

      const toolCalls = Array.isArray(call.tool_calls) ? call.tool_calls : [];
      for (const tool of toolCalls) {
        const toolName = tool?.name ?? "tool";
        const args = tool?.arguments ?? {};
        if (toolName === "talk") {
          const to = normalizeText(args.member || args.to || "Unknown member").trim() || "Unknown member";
          const text = normalizeText(args.text);
          pushEvent(events, {
            t,
            turn,
            cycle,
            from,
            to,
            kind: "talk",
            text,
            tokens,
            latencyMs,
            error: null,
          });
          continue;
        }
        if (toolName === "add_to_common_space") {
          pushEvent(events, {
            t,
            turn,
            cycle,
            from,
            to: COMMON_SPACE_ID,
            kind: "common_space",
            text: normalizeText(args.text),
            tokens,
            latencyMs,
            error: null,
          });
          continue;
        }
        if (toolName === "consensus") {
          const text = normalizeText(args.reasoning ?? args.move ?? args);
          if (text) {
            pushEvent(events, {
              t,
              turn,
              cycle,
              from,
              to: COMMON_SPACE_ID,
              kind: "common_space",
              text,
              tokens,
              latencyMs,
              error: null,
            });
          }
          continue;
        }
        pushEvent(events, {
          t,
          turn,
          cycle,
          from,
          to: from,
          kind: "tool",
          text: normalizeText(args),
          tokens,
          latencyMs,
          error: null,
        });
      }

      if (toolCalls.length === 0) {
        const raw =
          typeof call.raw_response === "string" && call.raw_response.trim()
            ? call.raw_response
            : typeof call.response === "string" && call.response.trim()
              ? call.response
              : "";
        if (raw) {
          pushEvent(events, {
            t,
            turn,
            cycle,
            from,
            to: from,
            kind: "tool",
            text: normalizeText(raw),
            tokens,
            latencyMs,
            error: null,
          });
        }
      }
    }
  }

  return events.sort((a, b) => a.t - b.t);
}

export function extractAgents(dataset: ExperimentDataset): string[] {
  const set = new Set<string>();
  const moves = Array.isArray(dataset.moves) ? dataset.moves : [];
  for (const move of moves) {
    const calls = move.system_move_record?.calls ?? [];
    for (const call of calls) {
      set.add(callerName(call));
      const toolCalls = Array.isArray(call.tool_calls) ? call.tool_calls : [];
      for (const tool of toolCalls) {
        if (tool?.name === "talk") {
          const to = normalizeText(tool.arguments?.member).trim();
          if (to) set.add(to);
        } else if (tool?.name === "add_to_common_space") {
          set.add(COMMON_SPACE_ID);
        }
      }
    }
  }
  return Array.from(set);
}

export function buildInteractionGraph(events: InteractionEvent[]): InteractionGraphData {
  const nodeMap = new Map<string, InteractionGraphNode>();
  const edgeMap = new Map<string, InteractionGraphEdge>();

  for (const e of events) {
    if (!nodeMap.has(e.from)) {
      nodeMap.set(e.from, {
        id: e.from,
        label: e.from,
        role: inferRole(e.from),
        messageCount: 0,
      });
    }
    if (!nodeMap.has(e.to)) {
      nodeMap.set(e.to, {
        id: e.to,
        label: e.to,
        role: e.to === COMMON_SPACE_ID ? "shared" : inferRole(e.to),
        messageCount: 0,
      });
    }
    nodeMap.get(e.from)!.messageCount += 1;
    nodeMap.get(e.to)!.messageCount += 1;

    const edgeId = `${e.from}__${e.to}`;
    const existing = edgeMap.get(edgeId);
    if (!existing) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: e.from,
        target: e.to,
        weight: 1,
        kinds: { talk: 0, common_space: 0, tool: 0, error: 0 },
        samples: [e],
        lastTimestamp: e.t,
      });
    } else {
      existing.weight += 1;
      existing.lastTimestamp = Math.max(existing.lastTimestamp, e.t);
      if (existing.samples.length < 80) {
        existing.samples.push(e);
      }
    }
    const edge = edgeMap.get(edgeId)!;
    edge.kinds[e.kind] = (edge.kinds[e.kind] ?? 0) + 1;
  }

  return {
    nodes: Array.from(nodeMap.values()).sort((a, b) => b.messageCount - a.messageCount),
    edges: Array.from(edgeMap.values()).sort((a, b) => b.weight - a.weight),
  };
}

export function datasetToChessReplayPayloads(dataset: ExperimentDataset) {
  const moves = Array.isArray(dataset.moves) ? dataset.moves : [];
  const payloads: Array<Record<string, unknown>> = [];
  for (const move of moves) {
    const envState = (move.env_state ?? {}) as Record<string, unknown>;
    const uci = typeof envState.uci === "string" ? envState.uci : undefined;
    if (!uci) continue;
    payloads.push({
      type: "event",
      ply: typeof envState.ply === "number" ? (envState.ply as number) - 1 : move.turn,
      uci,
      player: move.player,
      reasoning: "",
      centipawns_total:
        typeof envState.centipawn_eval === "number" ? envState.centipawn_eval : undefined,
      centipawns_current:
        typeof envState.centipawn_eval_delta === "number" ? envState.centipawn_eval_delta : undefined,
      latency_ms: move.latency_ms,
    });
  }
  payloads.push({ type: "end" });
  return payloads;
}

/** `turn` field on the move record for the Nth UCI replay step (0-based), for aligning the interaction graph with playback. */
export function turnAtChessReplayStep(dataset: ExperimentDataset, movePayloadIndex: number): number | null {
  if (movePayloadIndex < 0) return null;
  const moves = Array.isArray(dataset.moves) ? dataset.moves : [];
  let i = 0;
  for (const move of moves) {
    const envState = (move.env_state ?? {}) as Record<string, unknown>;
    const uci = typeof envState.uci === "string" ? envState.uci : undefined;
    if (!uci) continue;
    if (i === movePayloadIndex) {
      return typeof move.turn === "number" ? move.turn : 0;
    }
    i += 1;
  }
  return null;
}

export function datasetToEvalPlusMoves(dataset: ExperimentDataset): ExperimentMove[] {
  const moves = Array.isArray(dataset.moves) ? dataset.moves : [];
  return moves
    .filter((move) => move && typeof move.action === "string")
    .map((move) => ({
      ...move,
      env_state: {
        ...(move.env_state ?? {}),
        num_tasks:
          typeof move.env_state?.num_tasks === "number"
            ? move.env_state?.num_tasks
            : typeof move.env_state?.total_tasks === "number"
              ? move.env_state?.total_tasks
              : 0,
        current_task_id:
          typeof move.env_state?.current_task_id === "number"
            ? move.env_state?.current_task_id
            : 0,
        current_k:
          typeof move.env_state?.current_k === "number" ? move.env_state?.current_k : 0,
      },
      task_label:
        move.task_label ??
        ((move.env_state?.current_task_key as string | undefined) || undefined),
    }));
}
