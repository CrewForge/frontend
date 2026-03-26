import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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
import { buildFlowGraph, findDefaultMetaToCommonEdge, graphTopologySignature } from "./graphLayout";
import { InteractionGraphNode } from "./InteractionGraphNode";
import { EdgeEvidencePanel } from "./EdgeEvidencePanel";
import type { InteractionGraphData } from "../../lib/experiments/types";

const nodeTypes = { interactionNode: InteractionGraphNode };

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
}: {
  graph: InteractionGraphData;
  emptyLabel?: string;
  visible?: boolean;
  /** Narrow sidebar: shorter flow area, evidence stacked below. */
  layout?: "default" | "sideColumn";
  evidenceFocusTurn?: number | null;
  /** When true with `sideColumn` layout, graph pane height is doubled (wide right panel). */
  sideColumnExpanded?: boolean;
}) {
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const userClearedSelectionRef = useRef(false);
  const built = useMemo(
    () => buildFlowGraph(graph, { focusTurn: evidenceFocusTurn ?? null }),
    [graph, evidenceFocusTurn],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);

  const topologySig = useMemo(() => graphTopologySignature(graph), [graph]);

  useEffect(() => {
    userClearedSelectionRef.current = false;
  }, [topologySig]);

  useEffect(() => {
    const byId = new Map(built.edges.map((e) => [e.id, e]));
    setSelectedEdge((prev) => {
      if (prev) {
        const synced = byId.get(prev.id);
        if (synced) return synced;
      }
      if (userClearedSelectionRef.current) return null;
      const def = findDefaultMetaToCommonEdge(built.edges, graph);
      return def ? byId.get(def.id) ?? def : null;
    });
  }, [built.edges, graph]);

  useEffect(() => {
    setNodes(built.nodes as Node[]);
    setEdges(
      built.edges.map((e) => ({
        ...e,
        selected: selectedEdge?.id === e.id,
      })),
    );
  }, [built, setNodes, setEdges, selectedEdge?.id]);

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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          onEdgeClick={(_, edge) => {
            userClearedSelectionRef.current = false;
            setSelectedEdge(edge);
          }}
          onPaneClick={() => {
            userClearedSelectionRef.current = true;
            setSelectedEdge(null);
          }}
          proOptions={{ hideAttribution: true }}
        >
          <FlowFitWhenVisible visible={visible} graphSignature={topologySig} />
          {layout === "default" ? <MiniMap pannable zoomable /> : null}
          <Controls showInteractive={false} className={layout === "sideColumn" ? "scale-90" : undefined} />
          <Background gap={18} />
        </ReactFlow>
      </div>
    </Card>
  );

  if (layout === "sideColumn") {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {shell}
        <div className="min-h-0 max-h-[min(200px,28vh)] overflow-y-auto">
          <EdgeEvidencePanel edge={selectedEdge} focusTurn={evidenceFocusTurn} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      {shell}
      <EdgeEvidencePanel edge={selectedEdge} focusTurn={evidenceFocusTurn} />
    </div>
  );
}
