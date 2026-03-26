import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Layers, MessagesSquare, Radio, Wrench } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { cn } from "../ui/utils";
import type { InteractionEvent } from "../../lib/experiments/types";
import {
  buildEdgeCardModel,
  buildTurnTranscriptModel,
  type InteractionEdgeLike,
} from "./interactionCardModel";
import { InteractionMessageRow, formatWhen } from "./InteractionMessagePrimitives";

function ThreadChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn(
        "unified-graph-detail-card__chev size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
        className,
      )}
      aria-hidden
    />
  );
}

export function UnifiedGraphDetailCard({
  selectedEdge,
  focusTurn,
  events,
}: {
  selectedEdge: InteractionEdgeLike | null;
  focusTurn?: number | null;
  events: InteractionEvent[];
}) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [openThreadKey, setOpenThreadKey] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(true);
  const edgeModel = useMemo(
    () => buildEdgeCardModel(selectedEdge, focusTurn),
    [selectedEdge, focusTurn],
  );
  const transcript = useMemo(
    () => buildTurnTranscriptModel(events, focusTurn),
    [events, focusTurn],
  );

  useEffect(() => {
    if (selectedEdge?.id) {
      setMinimized(false);
    }
  }, [selectedEdge?.id]);

  if (minimized) {
    return (
      <Card className="unified-graph-detail-card unified-graph-detail-card--minimized pointer-events-auto w-[min(360px,88vw)] gap-1 border-border/70 bg-background/94 p-2 shadow-md backdrop-blur-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border/65 bg-muted/35 px-2 py-1 text-left hover:bg-muted/50"
          onClick={() => setMinimized(false)}
          aria-label="Expand graph message console"
        >
          <span>
            <span className="block text-[11px] font-semibold text-foreground">Graph message console</span>
            <span className="block text-[10px] text-muted-foreground">
              {edgeModel
                ? `${edgeModel.source} → ${edgeModel.target} · ${edgeModel.weight} msgs`
                : "Open edge + transcript details"}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </Card>
    );
  }

  return (
    <Card className="unified-graph-detail-card pointer-events-auto w-[min(430px,86vw)] gap-2 border-border/70 bg-background/96 p-2 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold tracking-tight text-foreground">Graph message console</h3>
          <p className="text-[10px] text-muted-foreground">
            Lossless view of edge evidence and step transcript.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            {focusTurn == null ? "all turns" : `turn ${focusTurn}`}
          </Badge>
          <button
            type="button"
            className="rounded border border-border/65 bg-muted/35 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/55 hover:text-foreground"
            onClick={() => setMinimized(true)}
            aria-label="Minimize graph message console"
          >
            Minimize
          </button>
        </div>
      </div>

      <Tabs defaultValue="edge" className="gap-1">
        <TabsList className="h-7 w-full rounded-md bg-muted/70 p-0.5">
          <TabsTrigger value="edge" className="h-6 text-[10px]">
            Edge detail
          </TabsTrigger>
          <TabsTrigger value="transcript" className="h-6 text-[10px]">
            Step transcript
          </TabsTrigger>
          <TabsTrigger value="overview" className="h-6 text-[10px]">
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edge" className="min-h-0">
          {!edgeModel ? (
            <p className="rounded border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              Select an edge speech bubble to inspect complete message history.
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="rounded border border-border/60 bg-muted/25 px-2 py-1.5">
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">
                      {edgeModel.source} → {edgeModel.target}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Last activity: {formatWhen(edgeModel.lastTimestamp)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {edgeModel.weight} msgs
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(edgeModel.kinds)
                    .filter(([, count]) => Number(count) > 0)
                    .map(([kind, count]) => (
                      <Badge key={kind} variant="secondary" className="text-[10px] font-normal">
                        {kind}: {count}
                      </Badge>
                    ))}
                </div>
              </div>

              <Tabs defaultValue="current" className="gap-1">
                <TabsList className="h-7 w-full rounded-md p-0.5">
                  <TabsTrigger value="current" className="h-6 text-[10px]">
                    Current ({edgeModel.currentTurnMessages.length})
                  </TabsTrigger>
                  <TabsTrigger value="other" className="h-6 text-[10px]">
                    Other ({edgeModel.otherTurnMessages.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="h-6 text-[10px]">
                    All ({edgeModel.allMessages.length})
                  </TabsTrigger>
                </TabsList>
                {(["current", "other", "all"] as const).map((tab) => {
                  const list =
                    tab === "current"
                      ? edgeModel.currentTurnMessages
                      : tab === "other"
                        ? edgeModel.otherTurnMessages
                        : edgeModel.allMessages;
                  return (
                    <TabsContent key={tab} value={tab}>
                      <div className="max-h-[190px] space-y-1 overflow-y-auto pr-0.5">
                        {list.length === 0 ? (
                          <p className="rounded border border-border/60 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground">
                            No messages in this section.
                          </p>
                        ) : (
                          list.map((item) => (
                            <InteractionMessageRow
                              key={`${tab}:${item.id}`}
                              event={item}
                              expanded={expandedMessageId === `${tab}:${item.id}`}
                              onToggle={() =>
                                setExpandedMessageId((prev) =>
                                  prev === `${tab}:${item.id}` ? null : `${tab}:${item.id}`,
                                )
                              }
                            />
                          ))
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transcript" className="min-h-0">
          {!transcript ? (
            <p className="rounded border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              Start replay to a turn to view transcript grouped by cycle and thread.
            </p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/25 px-2 py-1">
                <Layers className="size-3.5 text-primary/80" />
                <span className="text-[11px] font-semibold text-foreground">
                  Turn {transcript.turn}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  · {transcript.total} message{transcript.total === 1 ? "" : "s"}
                </span>
              </div>
              <div className="max-h-[190px] space-y-2 overflow-y-auto pr-0.5">
                {transcript.cycles.length === 0 ? (
                  <p className="rounded border border-border/60 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground">
                    No interaction events recorded for this turn.
                  </p>
                ) : (
                  transcript.cycles.map((cycle) => (
                    <section key={cycle.cycle} className="rounded border border-border/55 bg-background/80 p-1.5">
                      <div className="mb-1 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          Cycle {cycle.cycle}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{cycle.total} total</span>
                      </div>
                      <div className="space-y-1">
                        {cycle.threads.map((thread) => {
                          const isMain = thread.kind === "main";
                          const isTalk = thread.kind === "talk";
                          const key = `cycle:${cycle.cycle}:${thread.key}`;
                          return (
                            <Collapsible
                              key={thread.key}
                              open={openThreadKey === key}
                              onOpenChange={(nextOpen) => setOpenThreadKey(nextOpen ? key : null)}
                              className="step-thread group/thread"
                            >
                              <CollapsibleTrigger
                                className={cn(
                                  "flex w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px]",
                                  isMain && "border-violet-400/35 bg-violet-500/[0.08]",
                                  isTalk && "border-teal-500/30 bg-teal-500/[0.08]",
                                  !isMain && !isTalk && "border-amber-500/28 bg-amber-500/[0.08]",
                                )}
                              >
                                <ThreadChevron />
                                {isMain ? (
                                  <Radio className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                                ) : isTalk ? (
                                  <MessagesSquare className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                                ) : (
                                  <Wrench className="size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                                )}
                                <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                                  {thread.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {thread.items.length}
                                </span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-1 space-y-1 pl-1">
                                {thread.items.map((item) => (
                                  <InteractionMessageRow
                                    key={item.id}
                                    event={item}
                                    tone={thread.kind}
                                    expanded={expandedMessageId === item.id}
                                    onToggle={() =>
                                      setExpandedMessageId((prev) => (prev === item.id ? null : item.id))
                                    }
                                  />
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="rounded border border-border/60 bg-muted/25 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Turn scope</p>
              <p className="text-[12px] font-semibold text-foreground">
                {focusTurn == null ? "All turns" : `Turn ${focusTurn}`}
              </p>
            </div>
            <div className="rounded border border-border/60 bg-muted/25 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Visible events</p>
              <p className="text-[12px] font-semibold text-foreground">{events.length}</p>
            </div>
            <div className="rounded border border-border/60 bg-muted/25 px-2 py-1.5 sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Selected edge preview</p>
              <p className="line-clamp-2 text-[11px] text-foreground/90">
                {edgeModel?.preview ??
                  "Choose an edge bubble to inspect direction-level message previews and complete history."}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
