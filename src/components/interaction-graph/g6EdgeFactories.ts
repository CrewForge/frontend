import type { InteractionGraphEdge } from "../../lib/experiments/types";
import { buildEdgeCardModel, type InteractionEdgeLike } from "./interactionCardModel";

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function edgeToSelectionLike(edge: InteractionGraphEdge): InteractionEdgeLike {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      weight: edge.weight,
      kinds: edge.kinds,
      samples: edge.samples,
      lastTimestamp: edge.lastTimestamp,
    },
  };
}

export function buildEdgeBubbleText(edge: InteractionGraphEdge, focusTurn?: number | null): string {
  const model = buildEdgeCardModel(edgeToSelectionLike(edge), focusTurn);
  if (!model) return `${edge.weight}`;
  return `${edge.weight}`;
}

export function buildEdgePreviewText(edge: InteractionGraphEdge, focusTurn?: number | null): string {
  const model = buildEdgeCardModel(edgeToSelectionLike(edge), focusTurn);
  if (!model) return "(no messages)";
  return truncate(model.preview, 64);
}

export function edgeStrokeWidth(weight: number) {
  return Math.min(3.6, Math.max(1.2, 1 + weight / 6));
}

export function edgeColor(stepActive: boolean, dimmed: boolean) {
  if (stepActive) return "#2563eb";
  if (dimmed) return "#a1a1aa";
  return "#6b7280";
}
