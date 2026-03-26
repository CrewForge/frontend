import React from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "reactflow";

type Point = { x: number; y: number };

type EdgeData = {
  routedPoints?: Point[];
  weight?: number;
};

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return `M ${points[0].x} ${points[0].y} ${points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
}

function orthogonalizeEndpoints(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const out = [...points];
  if (out.length >= 3) {
    const s = out[0];
    const n = out[1];
    if (Math.abs(s.x - n.x) > 0.01 && Math.abs(s.y - n.y) > 0.01) {
      out.splice(1, 0, { x: s.x, y: n.y });
    }
  }
  if (out.length >= 3) {
    const t = out[out.length - 1];
    const p = out[out.length - 2];
    if (Math.abs(t.x - p.x) > 0.01 && Math.abs(t.y - p.y) > 0.01) {
      out.splice(out.length - 1, 0, { x: p.x, y: t.y });
    }
  }
  return out;
}

function polylineMidpoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.hypot(dx, dy);
    segLens.push(len);
    total += len;
  }
  if (total <= 0.0001) return points[Math.floor(points.length / 2)];
  const half = total / 2;
  let run = 0;
  for (let i = 0; i < segLens.length; i += 1) {
    const next = run + segLens[i];
    if (half <= next) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const t = (half - run) / segLens[i];
      return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
      };
    }
    run = next;
  }
  return points[points.length - 1];
}

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
}: EdgeProps<EdgeData>) {
  const routed = Array.isArray(data?.routedPoints) && data.routedPoints.length >= 2
    ? data.routedPoints
    : [{ x: sourceX, y: sourceY }, { x: targetX, y: targetY }];
  const middle = routed.length > 2 ? routed.slice(1, -1) : [];
  // Always anchor to ReactFlow's resolved handle coordinates (true rendered positions).
  const resolvedPathPoints = orthogonalizeEndpoints([{ x: sourceX, y: sourceY }, ...middle, { x: targetX, y: targetY }]);
  const path = pointsToPath(resolvedPathPoints);
  const mid = polylineMidpoint(resolvedPathPoints);
  const weight = typeof data?.weight === "number" ? data.weight : null;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} className={className} interactionWidth={22} />
      {weight != null && (
        <EdgeLabelRenderer>
          <div
            className="interaction-graph-edge-count nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
            aria-hidden
          >
            {weight}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

