import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

type SelfLoopBubble = {
  edgeId: string;
  hovered: boolean;
  selected: boolean;
  stepActive: boolean;
};

type GraphNodeData = {
  label: string;
  nodeKind: "meta" | "agent" | "common";
  messageCount: number;
  selfLoop?: SelfLoopBubble;
  onSelfLoopClick?: (edgeId: string) => void;
  onSelfLoopHoverChange?: (edgeId: string, hovered: boolean) => void;
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
      className={`interaction-graph-node-card relative flex flex-col items-center justify-center gap-1 rounded-lg border text-center shadow-sm ${nodeClasses(data.nodeKind)}`}
    >
      {data.selfLoop && (
        <button
          type="button"
          className={cn(
            "interaction-graph-thought-bubble nodrag nopan",
            data.selfLoop.stepActive && "interaction-graph-thought-bubble--step-active",
            data.selfLoop.selected && "interaction-graph-thought-bubble--selected",
            data.selfLoop.hovered && "interaction-graph-thought-bubble--hovered",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            data.onSelfLoopClick?.(data.selfLoop!.edgeId);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={() => data.onSelfLoopHoverChange?.(data.selfLoop!.edgeId, true)}
          onMouseLeave={() => data.onSelfLoopHoverChange?.(data.selfLoop!.edgeId, false)}
          aria-label={`Self messages for ${data.label}`}
        >
          <span className="interaction-graph-thought-bubble__dots">...</span>
          <span className="interaction-graph-thought-bubble__tail interaction-graph-thought-bubble__tail--a" />
          <span className="interaction-graph-thought-bubble__tail interaction-graph-thought-bubble__tail--b" />
        </button>
      )}
      <Handle id="in-top" type="target" position={Position.Top} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="in-right" type="target" position={Position.Right} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="in-bottom" type="target" position={Position.Bottom} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="in-left" type="target" position={Position.Left} className="interaction-graph-node-handle !border-0 !bg-current" />
      <span className="max-w-full break-words text-center text-xs font-semibold leading-tight">{data.label}</span>
      <Badge variant="secondary" className="shrink-0 px-1 py-0 text-xs leading-none">
        {data.messageCount}
      </Badge>
      <span className="text-xs uppercase leading-tight tracking-wide opacity-80">{kindLabel(data.nodeKind)}</span>
      <Handle id="out-top" type="source" position={Position.Top} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="out-right" type="source" position={Position.Right} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="out-bottom" type="source" position={Position.Bottom} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="out-left" type="source" position={Position.Left} className="interaction-graph-node-handle !border-0 !bg-current" />
    </div>
  );
}
