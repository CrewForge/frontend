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
  type InteractionEdgeLike,
} from "./interactionCardModel";
import {
  buildEdgeBubbleText,
  buildEdgePreviewText,
  edgeColor,
  edgeStrokeWidth,
  edgeToSelectionLike,
} from "./g6EdgeFactories";
import { renderNodeCardHtml } from "./g6NodeFactories";

function hasTurn(edge: { samples?: { turn: number }[] }, turn: number) {
  return (edge.samples ?? []).some((sample) => sample.turn === turn);
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
      const selfEdge = source.edges.find((edge) => edge.source === node.id && edge.target === node.id);
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
          size: [200, 122],
          innerHTML: renderNodeCardHtml(node, tabs, latestPreview, selfEdge?.id ?? null),
          dx: -100,
          dy: -61,
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
          lineDash: dimmed ? [4, 4] : undefined,
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
      ranksep: 74,
      nodesep: 54,
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
        },
        hover: {
          stroke: "#f59e0b",
          opacity: 1,
          labelBackgroundStroke: "#f59e0b",
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
  graph.fitView();
  await applyEdgeState(graph, selectedEdgeId, hoveredEdgeId);

  const resizeObserver = new ResizeObserver(() => {
    const nextW = Math.max(320, Math.floor(container.clientWidth || 320));
    const nextH = Math.max(280, Math.floor(container.clientHeight || 280));
    graph.resize(nextW, nextH);
    graph.fitView({ animation: false });
  });
  resizeObserver.observe(container);

  return {
    graph,
    destroy() {
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
  };
}
