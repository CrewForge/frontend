import { formatInteractionEvidenceDisplayText } from "../../lib/experiments/interactionEvidenceFormat";
import type {
  InteractionEvent,
  InteractionNodeTabSummary,
  InteractionTurnTranscript,
  InteractionTranscriptCycle,
  InteractionTranscriptThread,
} from "../../lib/experiments/types";

type EdgePayload = {
  weight?: number;
  kinds?: Record<string, number>;
  samples?: InteractionEvent[];
  lastTimestamp?: number;
};

const PREVIEW_CHARS = 96;
const COMMON_SPACE_ID = "CommonSpace";

export type EdgeCardModel = {
  id: string;
  source: string;
  target: string;
  weight: number;
  kinds: Record<string, number>;
  lastTimestamp: number;
  focusTurn: number | null;
  currentTurnMessages: InteractionEvent[];
  otherTurnMessages: InteractionEvent[];
  allMessages: InteractionEvent[];
  preview: string;
};

export type InteractionEdgeLike = {
  id: string;
  source: string;
  target: string;
  data?: EdgePayload;
};

export function compareEventsChronologically(a: InteractionEvent, b: InteractionEvent): number {
  if (a.t !== b.t) return a.t - b.t;
  return a.id.localeCompare(b.id);
}

function previewText(text: string) {
  const t = text.trim() || "(empty)";
  if (t.length <= PREVIEW_CHARS) return t;
  return `${t.slice(0, PREVIEW_CHARS).trim()}…`;
}

export function buildEdgeCardModel(
  edge: InteractionEdgeLike | null,
  focusTurn?: number | null,
): EdgeCardModel | null {
  if (!edge) return null;
  const payload = (edge.data ?? {}) as EdgePayload;
  const allMessages = [...(payload.samples ?? [])].sort(compareEventsChronologically);
  const normalizedFocus =
    focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);
  const currentTurnMessages =
    normalizedFocus == null ? allMessages : allMessages.filter((m) => m.turn === normalizedFocus);
  const otherTurnMessages =
    normalizedFocus == null ? [] : allMessages.filter((m) => m.turn !== normalizedFocus);
  const previewSource = currentTurnMessages.at(-1) ?? allMessages.at(-1) ?? null;
  const preview = previewSource
    ? previewText(formatInteractionEvidenceDisplayText(previewSource.text, previewSource.kind))
    : "(no messages)";
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    weight: payload.weight ?? 0,
    kinds: payload.kinds ?? {},
    lastTimestamp: payload.lastTimestamp ?? 0,
    focusTurn: normalizedFocus,
    currentTurnMessages,
    otherTurnMessages,
    allMessages,
    preview,
  };
}

function buildTalkThreadLabel(a: string, b: string) {
  return `Side: ${a} ↔ ${b}`;
}

function partitionCycle(items: InteractionEvent[]): InteractionTranscriptThread[] {
  const main = items
    .filter((e) => e.kind === "common_space")
    .sort(compareEventsChronologically);
  const talkMap = new Map<string, InteractionEvent[]>();
  for (const ev of items) {
    if (ev.kind !== "talk") continue;
    const endpoints = [ev.from, ev.to].sort((x, y) => x.localeCompare(y));
    const key = `${endpoints[0]}\u0001${endpoints[1]}`;
    const arr = talkMap.get(key) ?? [];
    arr.push(ev);
    talkMap.set(key, arr);
  }
  const talkThreads: InteractionTranscriptThread[] = [...talkMap.entries()]
    .map(([key, evs]) => {
      const sorted = [...evs].sort(compareEventsChronologically);
      const [a, b] = key.split("\u0001");
      return {
        key: `talk:${key}`,
        label: buildTalkThreadLabel(a ?? "?", b ?? "?"),
        kind: "talk" as const,
        items: sorted,
      };
    })
    .sort((a, b) => compareEventsChronologically(a.items[0]!, b.items[0]!));
  const internal = items
    .filter((e) => e.kind === "tool" || e.kind === "error")
    .sort(compareEventsChronologically);
  const out: InteractionTranscriptThread[] = [];
  if (main.length > 0) {
    out.push({
      key: "main",
      label: "Main: Shared deliberation",
      kind: "main",
      items: main,
    });
  }
  out.push(...talkThreads);
  if (internal.length > 0) {
    out.push({
      key: "internal",
      label: "Internal: Tools & responses",
      kind: "internal",
      items: internal,
    });
  }
  return out;
}

export function buildTurnTranscriptModel(
  events: InteractionEvent[],
  focusTurn?: number | null,
): InteractionTurnTranscript | null {
  const normalizedFocus =
    focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);
  if (normalizedFocus == null) return null;
  const filtered = events
    .filter((e) => e.turn === normalizedFocus)
    .sort((a, b) => a.cycle - b.cycle || compareEventsChronologically(a, b));
  const byCycle = new Map<number, InteractionEvent[]>();
  for (const ev of filtered) {
    const arr = byCycle.get(ev.cycle) ?? [];
    arr.push(ev);
    byCycle.set(ev.cycle, arr);
  }
  const cycles: InteractionTranscriptCycle[] = [...byCycle.keys()]
    .sort((a, b) => a - b)
    .map((cycle) => {
      const items = byCycle.get(cycle) ?? [];
      return {
        cycle,
        total: items.length,
        threads: partitionCycle(items),
      };
    });
  return {
    turn: normalizedFocus,
    total: filtered.length,
    cycles,
  };
}

function pickPreview(items: InteractionEvent[]): string {
  const sample = items.at(-1);
  if (!sample) return "(none)";
  return previewText(formatInteractionEvidenceDisplayText(sample.text, sample.kind));
}

export function buildNodeTabSummary(
  nodeId: string,
  edges: { source: string; target: string; samples: InteractionEvent[] }[],
): InteractionNodeTabSummary[] {
  const inbound = edges
    .filter((e) => e.target === nodeId && e.source !== nodeId)
    .flatMap((e) => e.samples);
  const outbound = edges
    .filter((e) => e.source === nodeId && e.target !== nodeId)
    .flatMap((e) => e.samples);
  const self = edges.filter((e) => e.source === nodeId && e.target === nodeId).flatMap((e) => e.samples);

  const sortedInbound = [...inbound].sort(compareEventsChronologically);
  const sortedOutbound = [...outbound].sort(compareEventsChronologically);
  const sortedSelf = [...self].sort(compareEventsChronologically);

  const commonLabel = nodeId === COMMON_SPACE_ID ? "shared" : "self";
  return [
    {
      key: "inbound",
      label: "Inbound",
      count: sortedInbound.length,
      preview: pickPreview(sortedInbound),
    },
    {
      key: "outbound",
      label: "Outbound",
      count: sortedOutbound.length,
      preview: pickPreview(sortedOutbound),
    },
    {
      key: "self",
      label: commonLabel,
      count: sortedSelf.length,
      preview: pickPreview(sortedSelf),
    },
  ];
}

export function buildNodeLatestPreview(
  nodeId: string,
  edges: { source: string; target: string; samples: InteractionEvent[] }[],
  focusTurn?: number | null,
): string {
  const focus =
    focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);
  const outbound = edges
    .filter((edge) => edge.source === nodeId)
    .flatMap((edge) =>
      focus == null ? edge.samples : edge.samples.filter((sample) => sample.turn <= focus),
    )
    .sort(compareEventsChronologically);
  return pickPreview(outbound);
}
