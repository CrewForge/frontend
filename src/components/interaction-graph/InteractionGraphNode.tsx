import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Badge } from "../ui/badge";

type GraphNodeData = {
  label: string;
  nodeKind: "meta" | "agent" | "common";
  messageCount: number;
};

function nodeClasses(kind: GraphNodeData["nodeKind"]) {
  if (kind === "meta") {
    return "border-primary/70 bg-primary/10 text-primary";
  }
  if (kind === "common") {
    return "border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-card text-foreground";
}

function kindLabel(kind: GraphNodeData["nodeKind"]) {
  if (kind === "meta") return "meta model";
  if (kind === "common") return "shared memory";
  return "crew";
}

export function InteractionGraphNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <div
      className={`interaction-graph-node-card flex flex-col items-center justify-center gap-1 rounded-lg border text-center shadow-sm ${nodeClasses(data.nodeKind)}`}
    >
      <Handle type="target" position={Position.Top} className="interaction-graph-node-handle !border-0 !bg-current" />
      <span className="max-w-full break-words text-center text-xs font-semibold leading-tight">{data.label}</span>
      <Badge variant="secondary" className="shrink-0 px-1 py-0 text-xs leading-none">
        {data.messageCount}
      </Badge>
      <span className="text-xs uppercase leading-tight tracking-wide opacity-80">{kindLabel(data.nodeKind)}</span>
      <Handle type="source" position={Position.Bottom} className="interaction-graph-node-handle !border-0 !bg-current" />
    </div>
  );
}
