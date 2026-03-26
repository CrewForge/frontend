import dagre from "dagre";
import type { Edge, Node } from "reactflow";
import { Position } from "reactflow";
import type { InteractionGraphData } from "../../lib/experiments/types";

const META_HINT = "meta";
const COMMON_SPACE_ID = "CommonSpace";

/** Must match approximate measured size of `InteractionGraphNode` for layout + fitView. */
const NODE_W = 168;
const NODE_H = 96;

function normalizeLabel(v: string) {
  return v.toLowerCase();
}

function nodeTypeFor(label: string) {
  const n = normalizeLabel(label);
  if (label === COMMON_SPACE_ID) return "common";
  if (n.includes(META_HINT)) return "meta";
  return "agent";
}

function buildReactFlowEdges(graph: InteractionGraphData): Edge[] {
  return graph.edges.map((e, i) => {
    const spread = ((i % 11) - 5) * 4;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      pathOptions: { borderRadius: 20, offset: spread },
      animated: e.weight > 6,
      label: `${e.weight}`,
      data: {
        weight: e.weight,
        kinds: e.kinds,
        samples: e.samples,
        lastTimestamp: e.lastTimestamp,
      },
      style: {
        strokeWidth: Math.min(5.5, Math.max(1.5, 1 + e.weight / 2.5)),
        opacity: 0.84,
      },
    };
  });
}

function nodeData(n: { id: string; label: string; messageCount: number }, kind: string) {
  return {
    label: n.label,
    nodeKind: kind as "meta" | "agent" | "common",
    messageCount: n.messageCount,
  };
}

/** Layered layout (minimizes crossings; spaces ranks). Falls back if layout fails. */
function layoutWithDagre(graph: InteractionGraphData): Map<string, { x: number; y: number }> | null {
  if (graph.nodes.length === 0) return new Map();

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  const n = graph.nodes.length;
  const eCount = graph.edges.length;
  const nodesep = Math.min(120, Math.max(52, 40 + n * 3 + eCount * 0.5));
  const ranksep = Math.min(140, Math.max(64, 48 + n * 2));
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
  const COL_X = 28;
  const ROW_H = 88;

  const out = new Map<string, { x: number; y: number }>();
  let yCursor = 20;

  if (meta) {
    out.set(meta.id, { x: centerX(), y: yCursor });
    yCursor = 108;
  } else {
    yCursor = 36;
  }

  agents.forEach((a, i) => {
    out.set(a.id, { x: COL_X, y: yCursor + i * ROW_H });
  });

  const agentsBlockH = agents.length * ROW_H;
  const commonY = Math.max(yCursor + agentsBlockH + 36, 280);

  if (common) {
    out.set(common.id, { x: centerX(), y: commonY });
  }

  return out;
}

export function buildFlowGraph(graph: InteractionGraphData): { nodes: Node[]; edges: Edge[] } {
  const edges = buildReactFlowEdges(graph);

  if (graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  let positions = layoutWithDagre(graph);
  if (!positions || positions.size < graph.nodes.length) {
    positions = manualLayoutPositions(graph);
  }

  const nodes: Node[] = graph.nodes.map((n) => {
    const kind = nodeTypeFor(n.label);
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      type: "interactionNode",
      position: pos,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: nodeData(n, kind),
    };
  });

  return { nodes, edges };
}
