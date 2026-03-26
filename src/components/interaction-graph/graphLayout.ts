import type { Edge, Node } from "reactflow";
import { Position } from "reactflow";
import type { InteractionGraphData } from "../../lib/experiments/types";

const META_HINT = "meta";
const COMMON_SPACE_ID = "CommonSpace";

const NODE_W = 140;
const CANVAS_W = 440;
const COL_X = 28;
const ROW_H = 84;

function normalizeLabel(v: string) {
  return v.toLowerCase();
}

function nodeTypeFor(label: string) {
  const n = normalizeLabel(label);
  if (label === COMMON_SPACE_ID) return "common";
  if (n.includes(META_HINT)) return "meta";
  return "agent";
}

function centerX() {
  return CANVAS_W / 2 - NODE_W / 2;
}

export function buildFlowGraph(graph: InteractionGraphData): { nodes: Node[]; edges: Edge[] } {
  const baseNodes = graph.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: nodeTypeFor(n.label),
    messageCount: n.messageCount,
  }));

  const meta = baseNodes.find((n) => n.type === "meta");
  const common = baseNodes.find((n) => n.type === "common");
  const agents = baseNodes
    .filter((n) => n.type !== "common" && n.type !== "meta")
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));

  const nodes: Node[] = [];

  let yCursor = 20;

  if (meta) {
    nodes.push({
      id: meta.id,
      type: "interactionNode",
      position: { x: centerX(), y: yCursor },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: meta.label,
        nodeKind: meta.type,
        messageCount: meta.messageCount,
      },
    });
    yCursor = 108;
  } else {
    yCursor = 36;
  }

  agents.forEach((n, i) => {
    nodes.push({
      id: n.id,
      type: "interactionNode",
      position: { x: COL_X, y: yCursor + i * ROW_H },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: n.label,
        nodeKind: n.type,
        messageCount: n.messageCount,
      },
    });
  });

  const agentsBlockH = agents.length * ROW_H;
  const commonY = Math.max(yCursor + agentsBlockH + 36, 280);

  if (common) {
    nodes.push({
      id: common.id,
      type: "interactionNode",
      position: { x: centerX(), y: commonY },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: common.label,
        nodeKind: common.type,
        messageCount: common.messageCount,
      },
    });
  }

  const edges: Edge[] = graph.edges.map((e, i) => {
    const spread = ((i % 9) - 4) * 5;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      pathOptions: { borderRadius: 18, offset: spread },
      animated: e.weight > 6,
      label: `${e.weight}`,
      data: {
        weight: e.weight,
        kinds: e.kinds,
        samples: e.samples,
        lastTimestamp: e.lastTimestamp,
      },
      style: {
        strokeWidth: Math.min(6, Math.max(1.6, 1 + e.weight / 2.5)),
        opacity: 0.82,
      },
    };
  });

  return { nodes, edges };
}
