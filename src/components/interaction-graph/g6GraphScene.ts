import {
  CanvasEvent,
  EdgeEvent,
  Graph,
  NodeEvent,
  type EdgeData as G6EdgeData,
  type GraphData,
} from "@antv/g6";
import type { InteractionGraphData } from "../../lib/experiments/types";
import {
  buildNodeLatestPreview,
  buildNodeTabSummary,
  buildNodeTurnOutboundStack,
  type InteractionEdgeLike,
} from "./interactionCardModel";
import {
  buildEdgeBubbleText,
  buildEdgePreviewText,
  edgeColor,
  edgeStrokeWidth,
  edgeToSelectionLike,
} from "./g6EdgeFactories";
import { estimateG6NodeCardSize, renderNodeCardHtml } from "./g6NodeFactories";

function hasTurn(edge: { samples?: { turn: number }[] }, turn: number) {
  return (edge.samples ?? []).some((sample) => sample.turn === turn);
}

/** Edges with traffic on the replay focus turn (non–self-loops) — animated flow along source→target. */
function computeFlowingEdgeIds(source: InteractionGraphData, focus: number | null): string[] {
  if (focus == null) return [];
  return source.edges
    .filter((edge) => edge.source !== edge.target && hasTurn(edge, focus))
    .map((edge) => edge.id);
}

const FLOW_DASH_PATTERN: [number, number] = [8, 6];
const FLOW_DASH_PERIOD = FLOW_DASH_PATTERN[0] + FLOW_DASH_PATTERN[1];

function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Flush queued edge style updates to the canvas (updateEdgeData alone does not always redraw each frame). */
function flushG6StyleDraw(graph: Graph) {
  const ctx = (
    graph as unknown as {
      context?: {
        element?: {
          draw: (opts?: { animation?: boolean }) => { finished?: Promise<void> } | undefined;
        };
      };
    }
  ).context;
  const task = ctx?.element?.draw({ animation: false });
  void task?.finished;
}

function resolveEdgeIdFromEvent(graph: Graph, event: unknown): string | null {
  const evt = event as Record<string, unknown> | undefined;
  const target = (evt?.target as Record<string, unknown> | undefined) ?? undefined;
  const candidates = [
    target?.id,
    target?.["data-id"],
    (target?.attributes as Record<string, unknown> | undefined)?.id,
    (target?.config as Record<string, unknown> | undefined)?.id,
    (evt?.data as Record<string, unknown> | undefined)?.id,
    (evt?.item as Record<string, unknown> | undefined)?.id,
  ].filter((candidate): candidate is string => typeof candidate === "string");
  for (const candidate of candidates) {
    if (graph.hasEdge(candidate)) return candidate;
  }
  if (candidates.length === 0) return null;
  const edges = graph.getEdgeData();
  const first = candidates[0]!;
  const match = edges.find((edge) => typeof edge.id === "string" && first.includes(edge.id));
  return (match?.id as string | undefined) ?? null;
}

function buildG6Data(source: InteractionGraphData, focusTurn?: number | null): GraphData {
  const focus = focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);
  const compactEdges = source.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    samples: edge.samples,
  }));
  return {
    nodes: source.nodes.map((node) => {
      const tabs = buildNodeTabSummary(node.id, compactEdges);
      const latestPreview = buildNodeLatestPreview(node.id, compactEdges, focusTurn);
      const turnOutboundStack = buildNodeTurnOutboundStack(node.id, compactEdges, focusTurn);
      const { width: nodeW, height: nodeH } = estimateG6NodeCardSize(turnOutboundStack);
      const selfEdge = source.edges.find((edge) => edge.source === node.id && edge.target === node.id);
      const selfEdgeStepActive = focus != null && !!selfEdge && hasTurn(selfEdge, focus);
      return {
        id: node.id,
        type: "html",
        data: {
          label: node.label,
          nodeKind: node.id === "CommonSpace" ? "common" : node.label.toLowerCase().includes("meta") ? "meta" : "agent",
          messageCount: node.messageCount,
          tabs,
        },
        style: {
          size: [nodeW, nodeH],
          innerHTML: renderNodeCardHtml(
            node,
            tabs,
            latestPreview,
            selfEdge?.id ?? null,
            selfEdgeStepActive,
            turnOutboundStack,
          ),
          dx: -Math.round(nodeW / 2),
          dy: -Math.round(nodeH / 2),
          cursor: "pointer",
        },
      };
    }),
    edges: source.edges.filter((edge) => edge.source !== edge.target).map((edge) => {
      const stepActive = focus != null && hasTurn(edge, focus);
      const dimmed = focus != null && !stepActive;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "cubic-horizontal",
        data: {
          selection: edgeToSelectionLike(edge),
          preview: buildEdgePreviewText(edge, focusTurn),
        },
        style: {
          lineWidth: edgeStrokeWidth(edge.weight),
          stroke: edgeColor(stepActive, dimmed),
          lineDash: stepActive ? [...FLOW_DASH_PATTERN] : dimmed ? [4, 4] : undefined,
          lineDashOffset: stepActive ? 0 : undefined,
          opacity: stepActive ? 0.95 : dimmed ? 0.28 : 0.62,
          endArrow: false,
          label: true,
          labelText: buildEdgeBubbleText(edge, focusTurn),
          labelPlacement: "center",
          labelBackground: true,
          labelBackgroundFill: "#ffffff",
          labelBackgroundOpacity: 0.92,
          labelBackgroundStroke: "#d4d4d8",
          labelBackgroundLineWidth: 1,
          labelBackgroundRadius: 999,
          labelPadding: [2, 7],
          labelFontSize: 9,
          labelFontWeight: 700,
          labelFill: "#111827",
          cursor: "pointer",
        },
      };
    }),
  };
}

async function applyEdgeState(graph: Graph, selectedEdgeId: string | null, hoveredEdgeId: string | null) {
  const stateMap: Record<string, string[]> = {};
  for (const edge of graph.getEdgeData()) {
    const id = typeof edge.id === "string" ? edge.id : "";
    if (!id) continue;
    if (selectedEdgeId === id) stateMap[id] = ["selected"];
    else if (hoveredEdgeId === id) stateMap[id] = ["hover"];
    else stateMap[id] = [];
  }
  await graph.setElementState(stateMap, false);
}

export type G6SceneCallbacks = {
  onEdgeSelect: (edge: InteractionEdgeLike | null) => void;
  onEdgeHoverChange: (edge: InteractionEdgeLike | null) => void;
  onNodeSelect: (nodeId: string | null) => void;
};

export async function createG6GraphScene(
  container: HTMLElement,
  source: InteractionGraphData,
  focusTurn: number | null | undefined,
  callbacks: G6SceneCallbacks,
) {
  const focus =
    focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);
  const flowingEdgeIds = computeFlowingEdgeIds(source, focus);
  const data = buildG6Data(source, focusTurn);
  const width = Math.max(320, Math.floor(container.clientWidth || 320));
  const height = Math.max(280, Math.floor(container.clientHeight || 280));
  const graph = new Graph({
    container,
    width,
    height,
    data,
    animation: false,
    layout: {
      type: "antv-dagre",
      rankdir: "TB",
      ranksep: 40,
      nodesep: 34,
    },
    node: {
      state: {
        selected: {
          shadowColor: "#3b82f6",
          shadowBlur: 10,
        },
      },
    },
    edge: {
      state: {
        selected: {
          stroke: "#1d4ed8",
          lineWidth: 4.5,
          opacity: 1,
          labelBackgroundStroke: "#60a5fa",
          /* Keep dash/offset from data so replay (blue) flow keeps animating when selected. */
        },
        hover: {
          stroke: "#f59e0b",
          opacity: 1,
          labelBackgroundStroke: "#f59e0b",
          /* Solid line on hover — no dashed “flow” from mouseover; only replay step-active data uses dashes. */
          lineDash: 0,
        },
      },
    },
    behaviors: ["drag-canvas", "zoom-canvas", "drag-element"],
  });

  const edgeMap = new Map(source.edges.map((edge) => [edge.id, edgeToSelectionLike(edge)]));
  let selectedEdgeId: string | null = null;
  let hoveredEdgeId: string | null = null;

  graph.on(EdgeEvent.CLICK, async (event) => {
    const id = resolveEdgeIdFromEvent(graph, event);
    if (!id) return;
    selectedEdgeId = id;
    callbacks.onEdgeSelect(edgeMap.get(id) ?? null);
    await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);
  });

  graph.on(EdgeEvent.POINTER_ENTER, async (event) => {
    const id = resolveEdgeIdFromEvent(graph, event);
    hoveredEdgeId = id;
    callbacks.onEdgeHoverChange(id ? edgeMap.get(id) ?? null : null);
    await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);
  });

  graph.on(EdgeEvent.POINTER_LEAVE, async () => {
    hoveredEdgeId = null;
    callbacks.onEdgeHoverChange(null);
    await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);
  });

  graph.on(CanvasEvent.CLICK, async () => {
    selectedEdgeId = null;
    hoveredEdgeId = null;
    callbacks.onEdgeSelect(null);
    callbacks.onEdgeHoverChange(null);
    callbacks.onNodeSelect(null);
    await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);
  });

  graph.on(NodeEvent.CLICK, (event) => {
    const evt = event as Record<string, unknown> | undefined;
    const target = (evt?.target as Record<string, unknown> | undefined) ?? undefined;
    const candidate =
      (typeof target?.id === "string" ? target.id : null) ??
      (typeof (evt?.item as Record<string, unknown> | undefined)?.id === "string"
        ? ((evt?.item as Record<string, unknown>).id as string)
        : null);
    const nodeId = candidate && graph.hasNode(candidate) ? candidate : null;
    callbacks.onNodeSelect(nodeId);
  });

  await graph.render();
  graph.fitView({ animation: false, padding: [56, 24, 24, 24] });
  await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);

  let flowOffset = 0;
  let flowRaf = 0;
  let flowLastTs = performance.now();
  /** Offset units/sec along the dash pattern — time-based for smooth continuous motion. */
  const FLOW_OFFSET_SPEED = 16;
  const stepFlow = (now: number) => {
    if (graph.destroyed) return;
    const dt = Math.min(0.05, (now - flowLastTs) / 1000);
    flowLastTs = now;
    flowOffset = positiveMod(flowOffset - FLOW_OFFSET_SPEED * dt, FLOW_DASH_PERIOD);
    graph.updateEdgeData(
      flowingEdgeIds.map((id) => ({
        id,
        style: {
          lineDash: [...FLOW_DASH_PATTERN],
          lineDashOffset: flowOffset,
        },
      })),
    );
    flushG6StyleDraw(graph);
    flowRaf = requestAnimationFrame(stepFlow);
  };
  if (flowingEdgeIds.length > 0) {
    flowRaf = requestAnimationFrame(stepFlow);
  }

  const resizeObserver = new ResizeObserver(() => {
    const nextW = Math.max(320, Math.floor(container.clientWidth || 320));
    const nextH = Math.max(280, Math.floor(container.clientHeight || 280));
    graph.resize(nextW, nextH);
    graph.fitView({ animation: false, padding: [56, 24, 24, 24] });
  });
  resizeObserver.observe(container);

  return {
    graph,
    destroy() {
      if (flowRaf) cancelAnimationFrame(flowRaf);
      resizeObserver.disconnect();
      graph.destroy();
    },
    selectEdgeById: async (id: string | null) => {
      selectedEdgeId = id;
      callbacks.onEdgeSelect(id ? edgeMap.get(id) ?? null : null);
      await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);
    },
    getEdgeData: () => graph.getEdgeData() as G6EdgeData[],
    getElementPosition: (id: string) => {
      const pos = graph.getElementPosition(id) as { x?: number; y?: number } | undefined;
      return {
        x: typeof pos?.x === "number" ? pos.x : 0,
        y: typeof pos?.y === "number" ? pos.y : 0,
      };
    },
    relayoutAndFit: async () => {
      await graph.layout();
      graph.fitView({ animation: false, padding: [56, 24, 24, 24] });
    },
  };
}
