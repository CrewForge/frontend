import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "../ui/card";
import {
  buildFlowGraph,
  findDefaultSelectedEdge,
  graphTopologySignature,
} from "./graphLayout";
import { InteractionGraphNode } from "./InteractionGraphNode";
import type { InteractionGraphData, InteractionEvent } from "../../lib/experiments/types";
import { InteractionGraphEdge } from "./InteractionGraphEdge";
import { UnifiedGraphDetailCard } from "./UnifiedGraphDetailCard";

const nodeTypes = { interactionNode: InteractionGraphNode };
const edgeTypes = { interactionEdge: InteractionGraphEdge };

/** Refit when the graph becomes visible or resizes (e.g. layout / sidebar). */
function FlowFitWhenVisible({
  visible,
  graphSignature,
}: {
  visible: boolean;
  graphSignature: string;
}) {
  const { fitView } = useReactFlow();
  const store = useStoreApi();
  const nodesInitialized = useNodesInitialized();
  const scheduleFit = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.12, duration: 200 });
      });
    });
  }, [fitView]);

  useEffect(() => {
    if (!visible || !nodesInitialized) return;
    scheduleFit();
  }, [visible, nodesInitialized, graphSignature, scheduleFit]);

  useEffect(() => {
    if (!visible) return;
    const domNode = store.getState().domNode;
    if (!domNode) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = domNode.getBoundingClientRect();
      if (width > 2 && height > 2) scheduleFit();
    });
    ro.observe(domNode);
    return () => ro.disconnect();
  }, [visible, store, scheduleFit, nodesInitialized]);

  return null;
}

export function InteractionGraphView({
  graph,
  emptyLabel = "No graph data in this range. Widen turn/cycle filters, or advance replay — agents appear when their deliberation or talk events are included.",
  visible = true,
  layout = "default",
  evidenceFocusTurn = null,
  sideColumnExpanded = false,
  interactionEvents,
}: {
  graph: InteractionGraphData;
  emptyLabel?: string;
  visible?: boolean;
  /** Narrow sidebar: shorter flow area, evidence stacked below. */
  layout?: "default" | "sideColumn";
  evidenceFocusTurn?: number | null;
  /** When true with `sideColumn` layout, graph pane height is doubled (wide right panel). */
  sideColumnExpanded?: boolean;
  /** Full interaction log for expandable step transcript (side column only). */
  interactionEvents?: InteractionEvent[];
}) {
  const HOVER_EDGE_STROKE = "#f59e0b"; // amber-500: distinct from primary/status hues, strong affordance
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const userClearedSelectionRef = useRef(false);
  const built = useMemo(
    () => buildFlowGraph(graph, { focusTurn: evidenceFocusTurn ?? null }),
    [graph, evidenceFocusTurn],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);
  const selfLoopEdgeByNode = useMemo(() => {
    const m = new Map<string, Edge>();
    for (const e of built.edges) {
      if (e.source === e.target) m.set(e.source, e);
    }
    return m;
  }, [built.edges]);

  const topologySig = useMemo(() => graphTopologySignature(graph), [graph]);

  useEffect(() => {
    userClearedSelectionRef.current = false;
    setHoveredEdgeId(null);
  }, [topologySig]);

  useEffect(() => {
    const byId = new Map(built.edges.map((e) => [e.id, e]));
    setSelectedEdge((prev) => {
      if (prev) {
        const synced = byId.get(prev.id);
        if (synced) return synced;
      }
      if (userClearedSelectionRef.current) return null;
      const def = findDefaultSelectedEdge(built.edges, graph);
      return def ? byId.get(def.id) ?? def : null;
    });
  }, [built.edges, graph]);

  const applyEdgeVisualState = useCallback(
    (input: Edge[]) =>
      input
        .filter((e) => e.source !== e.target) // self-connections are rendered as thought bubbles only
        .map((e) => {
        const baseStyle =
          ((e.data as { baseStyle?: Edge["style"] } | undefined)?.baseStyle as Edge["style"]) ?? e.style;
        return {
          ...e,
          hidden: false,
          selectable: e.source !== e.target,
          selected: selectedEdge?.id === e.id,
          style:
            hoveredEdgeId === e.id
              ? {
                  ...(baseStyle ?? {}),
                  stroke: HOVER_EDGE_STROKE,
                  opacity: 1,
                  strokeWidth: Math.min(
                    8,
                    (typeof baseStyle?.strokeWidth === "number" ? baseStyle.strokeWidth : 2) + 1.4,
                  ),
                }
              : baseStyle,
          data: {
            ...(e.data as Record<string, unknown>),
            onBubbleClick: (edgeId: string) => {
              if (edgeId !== e.id) return;
              userClearedSelectionRef.current = false;
              setSelectedEdge(e);
            },
            onBubbleHoverChange: (edgeId: string, hover: boolean) => {
              if (edgeId !== e.id) return;
              setHoveredEdgeId((current) => (hover ? edgeId : current === edgeId ? null : current));
            },
          },
        };
      }),
    [hoveredEdgeId, selectedEdge?.id],
  );

  const applyNodeSelfLoopState = useCallback(
    (input: Node[]) =>
      input.map((n) => {
        const selfEdge = selfLoopEdgeByNode.get(n.id);
        const isStepActive = selfEdge?.className === "interaction-graph-edge--step-active";
        const isSelected = !!selfEdge && selectedEdge?.id === selfEdge.id;
        const isHovered = !!selfEdge && hoveredEdgeId === selfEdge.id;
        return {
          ...n,
          data: {
            ...(n.data as Record<string, unknown>),
            selfLoop: selfEdge
              ? {
                  edgeId: selfEdge.id,
                  hovered: isHovered,
                  selected: isSelected,
                  stepActive: !!isStepActive,
                }
              : undefined,
            onSelfLoopClick: selfEdge
              ? (edgeId: string) => {
                  if (edgeId !== selfEdge.id) return;
                  userClearedSelectionRef.current = false;
                  setSelectedEdge(selfEdge);
                }
              : undefined,
            onSelfLoopHoverChange: selfEdge
              ? (edgeId: string, hover: boolean) => {
                  if (edgeId !== selfEdge.id) return;
                  setHoveredEdgeId((current) => (hover ? edgeId : current === edgeId ? null : current));
                }
              : undefined,
          },
        };
      }),
    [hoveredEdgeId, selectedEdge?.id, selfLoopEdgeByNode],
  );

  useEffect(() => {
    setNodes((prev) => {
      const prevPosById = new Map(prev.map((n) => [n.id, n.position]));
      const nextBase = (built.nodes as Node[]).map((n) => ({
        ...n,
        position: prevPosById.get(n.id) ?? n.position,
      }));
      return applyNodeSelfLoopState(nextBase);
    });
    setEdges(applyEdgeVisualState(built.edges));
  }, [built.nodes, built.edges, setNodes, setEdges, applyEdgeVisualState, applyNodeSelfLoopState]);

  useEffect(() => {
    setNodes((prev) => applyNodeSelfLoopState(prev));
    setEdges((prev) => applyEdgeVisualState(prev));
  }, [applyEdgeVisualState, applyNodeSelfLoopState, setEdges, setNodes]);

  if (built.nodes.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </Card>
    );
  }

  const flowShell =
    layout === "sideColumn"
      ? `sandbox-graph-flow-side w-full${sideColumnExpanded ? " sandbox-graph-flow-side--expanded" : ""}`
      : "sandbox-graph-flow-default w-full bg-muted/30";

  const shell = (
    <Card className="overflow-hidden">
      <div className={flowShell}>
        <ReactFlow
          key={topologySig}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          onEdgeClick={(_, edge) => {
            userClearedSelectionRef.current = false;
            setSelectedEdge(edge);
          }}
          onEdgeMouseEnter={(_, edge) => {
            setHoveredEdgeId(edge.id);
          }}
          onEdgeMouseLeave={() => {
            setHoveredEdgeId(null);
          }}
          onPaneClick={() => {
            userClearedSelectionRef.current = true;
            setSelectedEdge(null);
            setHoveredEdgeId(null);
          }}
          proOptions={{ hideAttribution: true }}
        >
          <FlowFitWhenVisible visible={visible} graphSignature={topologySig} />
          {layout === "default" ? <MiniMap pannable zoomable /> : null}
          <Controls showInteractive={false} className={layout === "sideColumn" ? "scale-90" : undefined} />
          <Background gap={18} />
          <Panel position="bottom-right">
            <UnifiedGraphDetailCard
              selectedEdge={selectedEdge}
              focusTurn={evidenceFocusTurn}
              events={interactionEvents ?? []}
            />
          </Panel>
        </ReactFlow>
      </div>
    </Card>
  );

  if (layout === "sideColumn") {
    return (
      <div className="interaction-graph-side-column">
        <div className="interaction-graph-flow-slot">
          {shell}
        </div>
      </div>
    );
  }

  return shell;
}
