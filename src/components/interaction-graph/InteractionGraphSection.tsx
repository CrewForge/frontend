import React, { useMemo } from "react";
import type { ExperimentDataset } from "../../lib/experiments/types";
import { buildInteractionGraph, extractInteractionEvents } from "../../lib/experiments/normalize";
import { graphTopologySignature } from "./graphLayout";
import { InteractionGraphView } from "./InteractionGraphView";

export function InteractionGraphSection({
  dataset,
  className,
  layout = "default",
  evidenceFocusTurn = null,
}: {
  dataset: ExperimentDataset | null;
  className?: string;
  layout?: "default" | "sideColumn";
  /** Align edge evidence with replay step (EvalPlus move turn / chess UCI step). */
  evidenceFocusTurn?: number | null;
}) {
  const allEvents = useMemo(
    () => (dataset ? extractInteractionEvents(dataset) : []),
    [dataset],
  );

  const graph = useMemo(() => buildInteractionGraph(allEvents), [allEvents]);

  /** Remount + full Dagre relayout whenever an agent (node) or edge is created or destroyed. */
  const graphViewKey = useMemo(() => graphTopologySignature(graph), [graph]);

  return (
    <div className={className ?? "space-y-3"}>
      <div className="px-0.5">
        <h3 className="text-sm font-semibold leading-tight">Agent interaction graph</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Nodes are crew agents and shared space (CommonSpace); edges aggregate talk, shared memory, and deliberation.
          Replay scopes message text to the current step.
        </p>
      </div>
      <InteractionGraphView
        key={graphViewKey}
        graph={graph}
        visible
        layout={layout}
        evidenceFocusTurn={evidenceFocusTurn}
      />
    </div>
  );
}
