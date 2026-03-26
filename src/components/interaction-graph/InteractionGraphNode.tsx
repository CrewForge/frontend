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

export function InteractionGraphNode({ data }: NodeProps<GraphNodeData>) {
  return (
    <div className={`min-w-[140px] rounded-xl border px-2.5 py-2 shadow-sm ${nodeClasses(data.nodeKind)}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-current" />
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2 text-xs font-semibold leading-tight">{data.label}</span>
        <Badge variant="secondary" className="text-[10px]">
          {data.messageCount}
        </Badge>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide opacity-80">
        {data.nodeKind === "meta" ? "meta model" : data.nodeKind === "common" ? "shared memory" : "crew"}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-current" />
    </div>
  );
}
