import React, { useEffect, useMemo, useState } from "react";
import type { Edge } from "reactflow";
import { ChevronDown } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { cn } from "../ui/utils";
import type { InteractionEvent } from "../../lib/experiments/types";

function formatWhen(ts: number) {
  if (!ts) return "n/a";
  return new Date(ts).toLocaleString();
}

type EdgePayload = {
  weight?: number;
  kinds?: Record<string, number>;
  samples?: InteractionEvent[];
  lastTimestamp?: number;
};

const PREVIEW_CHARS = 140;

function previewText(text: string) {
  const t = text.trim() || "(empty)";
  if (t.length <= PREVIEW_CHARS) return t;
  return `${t.slice(0, PREVIEW_CHARS).trim()}…`;
}

function MessageBubble({
  sample,
  expanded,
  onToggle,
}: {
  sample: InteractionEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const body = sample.text || "(empty)";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "interaction-edge-bubble box-border w-full rounded-lg border border-border/80 bg-background text-left text-xs shadow-sm transition hover:border-primary/35 hover:bg-muted/30",
        expanded && "ring-1 ring-primary/30",
      )}
    >
      <div className="mb-0.5 flex flex-wrap items-center justify-start gap-x-1 gap-y-0.5 text-[10px] leading-none text-muted-foreground">
        <span className="font-medium text-foreground">turn {sample.turn}</span>
        <span aria-hidden>·</span>
        <span>cycle {sample.cycle}</span>
        <Badge variant="outline" className="text-[9px] uppercase">
          {sample.kind}
        </Badge>
      </div>
      <p className="whitespace-pre-wrap break-words text-left text-[11px] leading-[1.35] text-foreground/90">
        {expanded ? body : previewText(body)}
      </p>
      {body.length > PREVIEW_CHARS ? (
        <span className="mt-0.5 block text-[10px] font-medium text-primary">
          {expanded ? "Click to collapse" : "Click to read full message"}
        </span>
      ) : null}
    </button>
  );
}

export function EdgeEvidencePanel({
  edge,
  focusTurn,
}: {
  edge: Edge | null;
  /** When set (e.g. replay step), the main area only shows messages for this turn. */
  focusTurn?: number | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const payload = (edge?.data ?? {}) as EdgePayload;
  const samples = payload.samples ?? [];

  useEffect(() => {
    setExpandedId(null);
  }, [edge?.id]);

  const focus = focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);

  const stepSamples = useMemo(() => {
    if (focus === null) return samples;
    return samples.filter((s) => s.turn === focus);
  }, [samples, focus]);

  const otherTurnSamples = useMemo(() => {
    if (focus === null) return [];
    return samples.filter((s) => s.turn !== focus);
  }, [samples, focus]);

  const mainSamples = focus === null ? samples : stepSamples;

  if (!edge) {
    return (
      <Card className="sandbox-log-panel interaction-edge-panel gap-1.5">
        <h3 className="sandbox-log-title">Edge evidence</h3>
        <p className="sandbox-log-subtitle mb-0 mt-1">Select a connection in the graph to inspect reasoning snippets.</p>
      </Card>
    );
  }

  const kindEntries = Object.entries(payload.kinds ?? {}).filter(([, count]) => Number(count) > 0);
  const showOtherTurnsCollapsible = focus !== null && otherTurnSamples.length > 0;

  return (
    <Card className="sandbox-log-panel interaction-edge-panel gap-1.5">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
        <div className="min-w-0 flex-1">
          <h3 className="sandbox-log-title">
            {edge.source} → {edge.target}
          </h3>
          <p className="sandbox-log-subtitle mb-0">Last activity: {formatWhen(payload.lastTimestamp ?? 0)}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {payload.weight ?? 0} msgs
        </Badge>
      </div>

      {kindEntries.length > 0 && (
        <div className="-mt-0.5 flex flex-wrap gap-1">
          {kindEntries.map(([kind, count]) => (
            <Badge key={kind} variant="secondary" className="text-[10px] font-normal">
              {kind}: {count}
            </Badge>
          ))}
        </div>
      )}

      {focus !== null && (
        <p className="text-[10px] leading-tight text-muted-foreground">
          Turn <span className="font-medium text-foreground">{focus}</span> (current step)
        </p>
      )}

      <div className="interaction-edge-main-scroll space-y-1 pr-0.5">
        {mainSamples.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {focus !== null
              ? `No messages on this connection for turn ${focus}.`
              : "No snippets captured for this edge."}
          </p>
        ) : (
          mainSamples.map((sample) => (
            <MessageBubble
              key={sample.id}
              sample={sample}
              expanded={expandedId === sample.id}
              onToggle={() => setExpandedId((id) => (id === sample.id ? null : sample.id))}
            />
          ))
        )}
      </div>

      {showOtherTurnsCollapsible && (
        <Collapsible defaultOpen={false} className="border-t border-border/60 pt-1.5">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md px-0.5 py-0.5 text-left text-[10px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground">
            <span>Messages from other turns ({otherTurnSamples.length})</span>
            <ChevronDown className="interaction-edge-collapse-chevron h-3.5 w-3.5 shrink-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="interaction-edge-history-scroll mt-1 space-y-1 pr-0.5">
            {otherTurnSamples.map((sample) => (
              <MessageBubble
                key={`other-${sample.id}`}
                sample={sample}
                expanded={expandedId === `other-${sample.id}`}
                onToggle={() =>
                  setExpandedId((id) => (id === `other-${sample.id}` ? null : `other-${sample.id}`))
                }
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
