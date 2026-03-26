import React from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "reactflow";
import { cn } from "../ui/utils";

type EdgeData = {
  weight?: number;
  preview?: string;
  onBubbleClick?: (edgeId: string) => void;
  onBubbleHoverChange?: (edgeId: string, hovered: boolean) => void;
};

export function InteractionGraphEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  className,
  selected,
  pathOptions,
}: EdgeProps<EdgeData>) {
  const offset =
    typeof pathOptions === "object" &&
    pathOptions !== null &&
    "offset" in pathOptions &&
    typeof pathOptions.offset === "number"
      ? pathOptions.offset
      : 18;
  const borderRadius =
    typeof pathOptions === "object" &&
    pathOptions !== null &&
    "borderRadius" in pathOptions &&
    typeof pathOptions.borderRadius === "number"
      ? pathOptions.borderRadius
      : 14;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius,
    offset,
  });
  const weight = typeof data?.weight === "number" ? data.weight : null;
  const preview = (data?.preview ?? "").trim();
  const bubbleText = preview || "(no messages)";
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} className={className} interactionWidth={22} />
      {(weight != null || preview) && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className={cn(
              "interaction-graph-edge-bubble nodrag nopan",
              selected && "interaction-graph-edge-bubble--selected",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              data?.onBubbleClick?.(id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onMouseEnter={() => data?.onBubbleHoverChange?.(id, true)}
            onMouseLeave={() => data?.onBubbleHoverChange?.(id, false)}
            aria-label={`Inspect edge ${id}`}
          >
            <span className="interaction-graph-edge-bubble__weight">{weight ?? 0}</span>
            <span className="interaction-graph-edge-bubble__preview">{bubbleText}</span>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

