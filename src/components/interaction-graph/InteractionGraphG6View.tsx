import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../ui/card";
import type { InteractionEvent, InteractionGraphData } from "../../lib/experiments/types";
import { type InteractionEdgeLike } from "./interactionCardModel";
import { compareEventsChronologically } from "./interactionCardModel";
import { createG6GraphScene } from "./g6GraphScene";
import { InCanvasEdgeCard } from "./InCanvasEdgeCard";
import { InCanvasNodeCard } from "./InCanvasNodeCard";

function pickDefaultEdge(graph: InteractionGraphData): InteractionEdgeLike | null {
  const metaIds = new Set(
    graph.nodes
      .filter((node) => node.label.toLowerCase().includes("meta"))
      .map((node) => node.id),
  );
  const metaToCommon = graph.edges.find(
    (edge) => edge.target === "CommonSpace" && metaIds.has(edge.source),
  );
  if (metaToCommon) {
    return {
      id: metaToCommon.id,
      source: metaToCommon.source,
      target: metaToCommon.target,
      data: {
        weight: metaToCommon.weight,
        kinds: metaToCommon.kinds,
        samples: metaToCommon.samples,
        lastTimestamp: metaToCommon.lastTimestamp,
      },
    };
  }
  const first = graph.edges[0];
  if (!first) return null;
  return {
    id: first.id,
    source: first.source,
    target: first.target,
    data: {
      weight: first.weight,
      kinds: first.kinds,
      samples: first.samples,
      lastTimestamp: first.lastTimestamp,
    },
  };
}

export function InteractionGraphG6View({
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
  layout?: "default" | "sideColumn";
  evidenceFocusTurn?: number | null;
  sideColumnExpanded?: boolean;
  interactionEvents?: InteractionEvent[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Awaited<ReturnType<typeof createG6GraphScene>> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<InteractionEdgeLike | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selfEdgeMap = useMemo(() => {
    const map = new Map<string, InteractionEdgeLike>();
    for (const edge of graph.edges) {
      if (edge.source !== edge.target) continue;
      map.set(edge.id, {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: {
          weight: edge.weight,
          kinds: edge.kinds,
          samples: edge.samples,
          lastTimestamp: edge.lastTimestamp,
        },
      });
    }
    return map;
  }, [graph.edges]);

  useEffect(() => {
    if (!graph.edges.length) {
      setSelectedEdge(null);
      return;
    }
    setSelectedEdge((current) => {
      if (!current) return null;
      const match = graph.edges.find((edge) => edge.id === current.id);
      if (!match) return null;
      return {
        id: match.id,
        source: match.source,
        target: match.target,
        data: {
          weight: match.weight,
          kinds: match.kinds,
          samples: match.samples,
          lastTimestamp: match.lastTimestamp,
        },
      };
    });
  }, [graph]);

  useEffect(() => {
    if (!visible) return;
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    (async () => {
      const scene = await createG6GraphScene(container, graph, evidenceFocusTurn, {
        onEdgeSelect: (edge) => {
          setSelectedEdge(edge);
          if (edge) setSelectedNodeId(null);
        },
        onEdgeHoverChange: () => {
          // edge hover is intentionally not surfaced as a floating overlay;
          // all details stay inside persistent cards below the graph.
        },
        onNodeSelect: (nodeId) => {
          setSelectedNodeId(nodeId);
          if (nodeId) setSelectedEdge(null);
        },
      });
      if (disposed) {
        scene.destroy();
        return;
      }
      sceneRef.current = scene;
      if (selectedEdge?.id) {
        await scene.selectEdgeById(selectedEdge.id);
      }
    })();
    return () => {
      disposed = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, [graph, evidenceFocusTurn, visible]);

  useEffect(() => {
    if (visible) return;
    setSelectedEdge(null);
    setSelectedNodeId(null);
  }, [visible]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.selectEdgeById(selectedEdge?.id ?? null);
  }, [selectedEdge?.id]);

  const flowShell =
    layout === "sideColumn"
      ? `sandbox-graph-flow-side w-full${sideColumnExpanded ? " sandbox-graph-flow-side--expanded" : ""}`
      : "sandbox-graph-flow-default w-full bg-muted/30";

  const nodeGroups = useMemo(() => {
    if (!selectedNodeId) return null;
    const edges = graph.edges;
    const inbound = edges
      .filter((edge) => edge.target === selectedNodeId && edge.source !== selectedNodeId)
      .flatMap((edge) => edge.samples);
    const outbound = edges
      .filter((edge) => edge.source === selectedNodeId && edge.target !== selectedNodeId)
      .flatMap((edge) => edge.samples);
    const self = edges
      .filter((edge) => edge.source === selectedNodeId && edge.target === selectedNodeId)
      .flatMap((edge) => edge.samples);
    return {
      inbound: [...inbound].sort(compareEventsChronologically),
      outbound: [...outbound].sort(compareEventsChronologically),
      self: [...self].sort(compareEventsChronologically),
    };
  }, [graph.edges, selectedNodeId]);

  if (graph.nodes.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div
        className={`${flowShell} g6-graph-shell`}
        onClick={(event) => {
          const target = event.target as HTMLElement | null;
          const bubble = target?.closest("[data-self-edge-id]") as HTMLElement | null;
          const edgeId = bubble?.getAttribute("data-self-edge-id");
          if (!edgeId) return;
          const selfEdge = selfEdgeMap.get(edgeId);
          if (!selfEdge) return;
          event.preventDefault();
          event.stopPropagation();
          setSelectedNodeId(null);
          setSelectedEdge(selfEdge);
        }}
      >
        <div ref={containerRef} className="g6-graph-canvas" />
        {selectedEdge ? (
          <div className="g6-graph-inline-card g6-graph-inline-card--expanded">
            <InCanvasEdgeCard
              edge={selectedEdge}
              focusTurn={evidenceFocusTurn}
              onClose={() => setSelectedEdge(null)}
            />
          </div>
        ) : null}
        {selectedNodeId && nodeGroups ? (
          <div className="g6-graph-inline-card g6-graph-inline-card--expanded">
            <InCanvasNodeCard
              nodeId={selectedNodeId}
              groups={nodeGroups}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
