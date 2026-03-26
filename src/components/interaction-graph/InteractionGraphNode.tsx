import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { InteractionNodeTabSummary } from "../../lib/experiments/types";

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
  tabs?: InteractionNodeTabSummary[];
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
  const tabs = data.tabs ?? [];
  const defaultTab = tabs.find((tab) => tab.count > 0)?.key ?? "inbound";
  return (
    <div
      className={`interaction-graph-node-card relative flex flex-col gap-1.5 rounded-lg border text-left shadow-sm ${nodeClasses(data.nodeKind)}`}
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
      <div className="flex items-start justify-between gap-1">
        <span className="max-w-full break-words text-xs font-semibold leading-tight">{data.label}</span>
        <Badge variant="secondary" className="shrink-0 px-1 py-0 text-xs leading-none">
          {data.messageCount}
        </Badge>
      </div>
      <span className="text-[10px] uppercase leading-tight tracking-wide opacity-80">{kindLabel(data.nodeKind)}</span>
      {tabs.length > 0 && (
        <Tabs defaultValue={defaultTab} className="nodrag nopan w-full">
          <TabsList className="h-6 w-full rounded-md bg-background/50 p-0.5">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="h-5 px-1 text-[9px]">
                {tab.label} ({tab.count})
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-0.5">
              <p className="line-clamp-2 min-h-[2.2em] text-[10px] leading-tight text-foreground/85">
                {tab.preview}
              </p>
            </TabsContent>
          ))}
        </Tabs>
      )}
      <Handle id="out-top" type="source" position={Position.Top} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="out-right" type="source" position={Position.Right} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="out-bottom" type="source" position={Position.Bottom} className="interaction-graph-node-handle !border-0 !bg-current" />
      <Handle id="out-left" type="source" position={Position.Left} className="interaction-graph-node-handle !border-0 !bg-current" />
    </div>
  );
}
