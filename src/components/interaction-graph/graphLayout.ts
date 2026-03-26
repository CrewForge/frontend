import type { CSSProperties } from "react";
import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import { Position } from "reactflow";
import type { InteractionGraphData, InteractionGraphEdge } from "../../lib/experiments/types";
import { buildEdgeCardModel, buildNodeTabSummary } from "./interactionCardModel";

const META_HINT = "meta";
const COMMON_SPACE_ID = "CommonSpace";

/**
 * Approximate outer size of `InteractionGraphNode` (centered label + badge + role).
 * Dagre uses these so spacing reflows when nodes/edges change.
 */
/** Compact cards; Dagre uses these for rank/node spacing (visual may be slightly narrower for short labels). */
export const GRAPH_NODE_LAYOUT_W = 232;
export const GRAPH_NODE_LAYOUT_H = 154;

const NODE_W = GRAPH_NODE_LAYOUT_W;
const NODE_H = GRAPH_NODE_LAYOUT_H;
const EDGE_PAD = 14;

function normalizeLabel(v: string) {
  return v.toLowerCase();
}

function nodeTypeFor(label: string) {
  const n = normalizeLabel(label);
  if (label === COMMON_SPACE_ID) return "common";
  if (n.includes(META_HINT)) return "meta";
  return "agent";
}

function edgeHasSamplesForTurn(edge: InteractionGraphEdge, turn: number): boolean {
  return (edge.samples ?? []).some((s) => s.turn === turn);
}

type EdgeHandles = {
  sourceHandle: "out-top" | "out-right" | "out-bottom" | "out-left";
  targetHandle: "in-top" | "in-right" | "in-bottom" | "in-left";
};

function chooseEdgeHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  isSelfLoop: boolean,
): EdgeHandles {
  if (isSelfLoop) {
    return { sourceHandle: "out-right", targetHandle: "in-left" };
  }
  const sourceCx = sourcePos.x + NODE_W / 2;
  const sourceCy = sourcePos.y + NODE_H / 2;
  const targetCx = targetPos.x + NODE_W / 2;
  const targetCy = targetPos.y + NODE_H / 2;
  const dx = targetCx - sourceCx;
  const dy = targetCy - sourceCy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "out-right", targetHandle: "in-left" }
      : { sourceHandle: "out-left", targetHandle: "in-right" };
  }
  return dy >= 0
    ? { sourceHandle: "out-bottom", targetHandle: "in-top" }
    : { sourceHandle: "out-top", targetHandle: "in-bottom" };
}

function buildReactFlowEdges(
  graph: InteractionGraphData,
  focusTurn: number | null,
  positions: Map<string, { x: number; y: number }>,
): Edge[] {
  const focus =
    focusTurn != null && !Number.isNaN(Number(focusTurn)) ? Number(focusTurn) : null;
  const pairTotals = new Map<string, { forward: number; reverse: number }>();
  const dirTotals = new Map<string, number>();

  for (const e of graph.edges) {
    if (e.source === e.target) continue;
    const [a, b] = [e.source, e.target].sort((x, y) => x.localeCompare(y));
    const pairKey = `${a}\u0001${b}`;
    const isForward = e.source === a;
    const pair = pairTotals.get(pairKey) ?? { forward: 0, reverse: 0 };
    if (isForward) pair.forward += 1;
    else pair.reverse += 1;
    pairTotals.set(pairKey, pair);
    const dirKey = `${e.source}\u0001${e.target}`;
    dirTotals.set(dirKey, (dirTotals.get(dirKey) ?? 0) + 1);
  }
  const dirSeen = new Map<string, number>();

  return graph.edges.map((e, i) => {
    const isSelfLoop = e.source === e.target;
    const baseW = Math.min(5.5, Math.max(1.5, 1 + e.weight / 2.5));
    const stepActive = focus !== null && edgeHasSamplesForTurn(e, focus);
    const sourcePos = positions.get(e.source) ?? { x: 0, y: 0 };
    const targetPos = positions.get(e.target) ?? { x: 0, y: 0 };
    const handles = chooseEdgeHandles(sourcePos, targetPos, isSelfLoop);
    let laneShift = 0;
    if (!isSelfLoop) {
      const [a, b] = [e.source, e.target].sort((x, y) => x.localeCompare(y));
      const pairKey = `${a}\u0001${b}`;
      const pair = pairTotals.get(pairKey);
      const hasBidirectional = !!pair && pair.forward > 0 && pair.reverse > 0;
      const dirKey = `${e.source}\u0001${e.target}`;
      const seen = dirSeen.get(dirKey) ?? 0;
      dirSeen.set(dirKey, seen + 1);
      const total = dirTotals.get(dirKey) ?? 1;
      const withinDirOffset = (seen - (total - 1) / 2) * 4;
      if (hasBidirectional) {
        const isForward = e.source === a;
        laneShift = (isForward ? -5 : 5) + withinDirOffset;
      } else {
        laneShift = withinDirOffset;
      }
    } else {
      laneShift = ((i % 3) - 1) * 4;
    }
    const laneOffset = Math.abs(laneShift);

    let style: CSSProperties;
    if (focus === null) {
      style = {
        strokeWidth: baseW,
        opacity: 0.84,
      };
    } else if (stepActive) {
      style = {
        stroke: "var(--primary)",
        strokeWidth: Math.min(7, baseW + 2),
        opacity: 1,
      };
    } else {
      style = {
        stroke: "color-mix(in oklab, var(--muted-foreground) 42%, transparent)",
        strokeWidth: baseW,
        opacity: 0.42,
      };
    }

    const edgeCard = buildEdgeCardModel(
      {
        id: e.id,
        source: e.source,
        target: e.target,
        data: {
          weight: e.weight,
          kinds: e.kinds,
          samples: e.samples,
          lastTimestamp: e.lastTimestamp,
        },
      } as Edge,
      focus,
    );
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: "interactionEdge",
      pathOptions: {
        borderRadius: 14,
        offset: EDGE_PAD + laneOffset,
      },
      animated: focus !== null ? stepActive : e.weight > 6,
      data: {
        weight: e.weight,
        kinds: e.kinds,
        samples: e.samples,
        lastTimestamp: e.lastTimestamp,
        preview: edgeCard?.preview ?? "(no messages)",
        focusTurn: focus,
        baseStyle: style,
      },
      style,
      className: focus === null ? undefined : stepActive ? "interaction-graph-edge--step-active" : "interaction-graph-edge--step-dim",
    };
  });
}

export function rerouteFlowEdgesForPositions(
  graph: InteractionGraphData,
  focusTurn: number | null,
  positions: Map<string, { x: number; y: number }>,
): Edge[] {
  return buildReactFlowEdges(graph, focusTurn, positions);
}

function nodeData(n: { id: string; label: string; messageCount: number }, kind: string) {
  return {
    label: n.label,
    nodeKind: kind as "meta" | "agent" | "common",
    messageCount: n.messageCount,
    tabs: [] as {
      key: "inbound" | "outbound" | "self";
      label: string;
      count: number;
      preview: string;
    }[],
  };
}

/** Layered layout (minimizes crossings; spaces ranks). Falls back if layout fails. */
function layoutWithDagre(graph: InteractionGraphData): Map<string, { x: number; y: number }> | null {
  if (graph.nodes.length === 0) return new Map();

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  const n = graph.nodes.length;
  const eCount = graph.edges.length;
  // Wider default spacing reduces chance of edge paths clipping through cards.
  const nodesep = Math.min(180, Math.max(88, 64 + n * 3 + eCount * 0.7));
  const ranksep = Math.min(210, Math.max(96, 72 + n * 2.2));
  const margin = Math.max(32, 20 + n * 2);

  g.setGraph({
    rankdir: "TB",
    align: "UL",
    nodesep,
    edgesep: 28,
    ranksep,
    marginx: margin,
    marginy: margin,
    ranker: "network-simplex",
    acyclicer: "greedy",
  });

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }

  const seen = new Set<string>();
  for (const edge of graph.edges) {
    const key = `${edge.source}\0${edge.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  try {
    dagre.layout(g);
  } catch {
    return null;
  }

  const raw = new Map<string, { x: number; y: number }>();
  for (const node of graph.nodes) {
    const laid = g.node(node.id);
    if (!laid || typeof laid.x !== "number" || typeof laid.y !== "number") continue;
    raw.set(node.id, {
      x: laid.x - NODE_W / 2,
      y: laid.y - NODE_H / 2,
    });
  }

  if (raw.size === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  raw.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  });
  const pad = 8;
  const dx = minX < pad ? pad - minX : 0;
  const dy = minY < pad ? pad - minY : 0;

  const shifted = new Map<string, { x: number; y: number }>();
  raw.forEach((p, id) => {
    shifted.set(id, { x: p.x + dx, y: p.y + dy });
  });

  return shifted;
}

/** Deterministic fallback when Dagre fails (e.g. unusual graphlib edge cases). */
function manualLayoutPositions(graph: InteractionGraphData): Map<string, { x: number; y: number }> {
  const baseNodes = graph.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: nodeTypeFor(n.label),
    messageCount: n.messageCount,
  }));

  const meta = baseNodes.find((x) => x.type === "meta");
  const common = baseNodes.find((x) => x.type === "common");
  const agents = baseNodes
    .filter((x) => x.type !== "common" && x.type !== "meta")
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));

  const CANVAS_W = 440;
  const centerX = () => CANVAS_W / 2 - NODE_W / 2;
  const COL_X = 20;
  const rowGap = NODE_H + 38;

  const out = new Map<string, { x: number; y: number }>();
  let yCursor = 16;

  if (meta) {
    out.set(meta.id, { x: centerX(), y: yCursor });
    yCursor += NODE_H + 28;
  } else {
    yCursor = 24;
  }

  agents.forEach((a, i) => {
    out.set(a.id, { x: COL_X, y: yCursor + i * rowGap });
  });

  const agentsBlockH = agents.length * rowGap;
  const commonY = Math.max(yCursor + agentsBlockH + 40, 300);

  if (common) {
    out.set(common.id, { x: centerX(), y: commonY });
  }

  return out;
}

/** Default panel selection: first meta-model node → CommonSpace (if that edge exists). */
export function findDefaultMetaToCommonEdge(
  edges: Edge[],
  graph: InteractionGraphData,
): Edge | null {
  const metaIds = new Set(
    graph.nodes.filter((n) => nodeTypeFor(n.label) === "meta").map((n) => n.id),
  );
  if (metaIds.size === 0) return null;
  for (const e of edges) {
    if (e.target === COMMON_SPACE_ID && metaIds.has(e.source)) return e;
  }
  return null;
}

function edgeWeight(e: Edge): number {
  const w = (e.data as { weight?: number } | undefined)?.weight;
  return typeof w === "number" ? w : 0;
}

/**
 * Default selected edge for the evidence panel: Meta→Common when present;
 * otherwise for a single crew agent prefer self-loop (tool messages to self), then agent→CommonSpace.
 */
export function findDefaultSelectedEdge(edges: Edge[], graph: InteractionGraphData): Edge | null {
  const metaCommon = findDefaultMetaToCommonEdge(edges, graph);
  if (metaCommon) return metaCommon;

  const crewNodes = graph.nodes.filter(
    (n) => n.id !== COMMON_SPACE_ID && nodeTypeFor(n.label) !== "meta",
  );

  if (crewNodes.length === 1) {
    const agentId = crewNodes[0].id;
    const self = edges.find((e) => e.source === e.target && e.source === agentId);
    if (self) return self;
    const toCommon = edges.find((e) => e.source === agentId && e.target === COMMON_SPACE_ID);
    if (toCommon) return toCommon;
  }

  const selfLoops = edges.filter((e) => e.source === e.target);
  if (selfLoops.length > 0) {
    return selfLoops.reduce((a, b) => (edgeWeight(a) >= edgeWeight(b) ? a : b));
  }

  return null;
}

/** Stable signature when agents/edges are added or removed — use for keys + fitView. */
export function graphTopologySignature(graph: InteractionGraphData): string {
  if (graph.nodes.length === 0 && graph.edges.length === 0) return "∅";
  const nodeIds = [...graph.nodes].map((n) => n.id).sort().join("\u0001");
  const edgeIds = [...graph.edges].map((e) => e.id).sort().join("\u0001");
  return `N:${nodeIds}|E:${edgeIds}`;
}

export function buildFlowGraph(
  graph: InteractionGraphData,
  options?: { focusTurn?: number | null },
): { nodes: Node[]; edges: Edge[] } {
  const focusTurn = options?.focusTurn ?? null;
  if (graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  let positions = layoutWithDagre(graph);
  if (!positions || positions.size < graph.nodes.length) {
    positions = manualLayoutPositions(graph);
  }

  const edges = buildReactFlowEdges(graph, focusTurn, positions);

  const compactEdges = graph.edges.map((e) => ({
    source: e.source,
    target: e.target,
    samples: e.samples,
  }));
  const nodes: Node[] = graph.nodes.map((n) => {
    const kind = nodeTypeFor(n.label);
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    const tabSummary = buildNodeTabSummary(n.id, compactEdges);
    return {
      id: n.id,
      type: "interactionNode",
      position: pos,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        ...nodeData(n, kind),
        tabs: tabSummary,
      },
    };
  });

  return { nodes, edges };
}
