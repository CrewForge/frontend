import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { buildFlowGraph } from "./graphLayout";
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
}: {
  graph: InteractionGraphData;
  emptyLabel?: string;
  visible?: boolean;
  /** Narrow sidebar: shorter flow area, evidence stacked below. */
  layout?: "default" | "sideColumn";
  evidenceFocusTurn?: number | null;
}) {
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const built = useMemo(() => buildFlowGraph(graph), [graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);

  useEffect(() => {
    setNodes(built.nodes as Node[]);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

  const graphSignature = useMemo(
    () => `${nodes.length}:${edges.length}:${graph.edges?.length ?? 0}`,
    [nodes.length, edges.length, graph.edges?.length],
  );

  if (built.nodes.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </Card>
    );
  }

  const flowShell =
    layout === "sideColumn"
      ? "sandbox-graph-flow-side w-full"
      : "sandbox-graph-flow-default w-full bg-muted/30";

  const shell = (
    <Card className="overflow-hidden">
      <div className={flowShell}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          onEdgeClick={(_, edge) => setSelectedEdge(edge)}
          onPaneClick={() => setSelectedEdge(null)}
          proOptions={{ hideAttribution: true }}
        >
          <FlowFitWhenVisible visible={visible} graphSignature={graphSignature} />
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
