import React, { useMemo } from "react";
import type { ExperimentDataset } from "../../lib/experiments/types";
import { buildInteractionGraph, extractInteractionEvents } from "../../lib/experiments/normalize";
import { InteractionGraphG6View } from "./InteractionGraphG6View";

export function InteractionGraphSection({
  dataset,
  className,
  layout = "default",
  evidenceFocusTurn = null,
  sideColumnExpanded = false,
}: {
  dataset: ExperimentDataset | null;
  className?: string;
  layout?: "default" | "sideColumn";
  /** Align edge evidence with replay step (EvalPlus move turn / chess UCI step). */
  evidenceFocusTurn?: number | null;
  /** Wide right panel: taller graph area in side column layout. */
  sideColumnExpanded?: boolean;
}) {
  const allEvents = useMemo(
    () => (dataset ? extractInteractionEvents(dataset) : []),
    [dataset],
  );

  const graph = useMemo(() => buildInteractionGraph(allEvents), [allEvents]);

  return (
    <div className={className ?? "space-y-3"}>
      <div className="px-0.5">
        <h3 className="text-sm font-semibold leading-tight">Crew Interactions</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-border/80 bg-primary/20" />
            Agent
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-violet-400/60 bg-violet-500/20" />
            Shared Space
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3.5 rounded bg-muted-foreground/50" />
            Communication
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3.5 rounded bg-primary" />
            Active
          </span>
        </div>
      </div>
      <InteractionGraphG6View
        graph={graph}
        visible
        layout={layout}
        evidenceFocusTurn={evidenceFocusTurn}
        sideColumnExpanded={sideColumnExpanded}
        interactionEvents={allEvents}
      />
    </div>
  );
}
