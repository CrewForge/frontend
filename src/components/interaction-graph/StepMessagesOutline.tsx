import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Layers, Radio, Wrench, AlertCircle, MessagesSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { cn } from "../ui/utils";
import type { InteractionEvent } from "../../lib/experiments/types";
import { formatInteractionEvidenceDisplayText } from "../../lib/experiments/interactionEvidenceFormat";

const COMMON_SPACE_ID = "CommonSpace";

function compareEventsChronologically(a: InteractionEvent, b: InteractionEvent): number {
  if (a.t !== b.t) return a.t - b.t;
  return a.id.localeCompare(b.id);
}

function groupByCycle(events: InteractionEvent[]): Map<number, InteractionEvent[]> {
  const m = new Map<number, InteractionEvent[]>();
  for (const e of events) {
    const c = e.cycle;
    const arr = m.get(c) ?? [];
    arr.push(e);
    m.set(c, arr);
  }
  for (const arr of m.values()) {
    arr.sort(compareEventsChronologically);
  }
  return m;
}

type Partition = {
  main: InteractionEvent[];
  talkPairs: { key: string; endpointA: string; endpointB: string; items: InteractionEvent[] }[];
  internal: InteractionEvent[];
};

/** Same thread for A→B and B→A (and any mix of directions between the two endpoints). */
function bidirectionalTalkPairKey(from: string, to: string): string {
  const [a, b] = [from, to].sort((x, y) => x.localeCompare(y));
  return `${a}\u0001${b}`;
}

function partitionCycleEvents(items: InteractionEvent[]): Partition {
  const main = items.filter((e) => e.kind === "common_space");
  const talkMap = new Map<string, InteractionEvent[]>();
  for (const e of items) {
    if (e.kind !== "talk") continue;
    const key = bidirectionalTalkPairKey(e.from, e.to);
    const arr = talkMap.get(key) ?? [];
    arr.push(e);
    talkMap.set(key, arr);
  }
  const talkPairs = [...talkMap.entries()]
    .map(([key, evs]) => {
      evs.sort(compareEventsChronologically);
      const [endpointA, endpointB] = key.split("\u0001") as [string, string];
      return { key, endpointA, endpointB, items: evs };
    })
    .sort((a, b) => compareEventsChronologically(a.items[0]!, b.items[0]!));

  const internal = items.filter((e) => e.kind === "tool" || e.kind === "error").sort(compareEventsChronologically);

  return { main, talkPairs, internal };
}

function ThreadChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn(
        "step-thread__chev size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
        className,
      )}
      aria-hidden
    />
  );
}

/** Click the card to expand/focus full body; collapsed state uses line-clamp (no JS truncation). */
function TranscriptRow({
  ev,
  variant,
  expanded,
  onToggle,
}: {
  ev: InteractionEvent;
  variant: "main" | "talk" | "internal";
  expanded: boolean;
  onToggle: () => void;
}) {
  const full = formatInteractionEvidenceDisplayText(ev.text, ev.kind);
  const hasBody = full.trim().length > 0;
  const [copied, setCopied] = useState(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    };
  }, []);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!full.trim()) return;
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = full;
        ta.setAttribute("aria-hidden", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        return;
      }
    }
    setCopied(true);
    if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    copyResetTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copyResetTimeoutRef.current = null;
    }, 1500);
  };

  const metaRight = (
    <span className="tabular-nums text-[9px] text-muted-foreground">
      {typeof ev.latencyMs === "number" ? `${ev.latencyMs} ms` : "—"}
      {typeof ev.tokens === "number" && ev.tokens > 0 ? ` · ${ev.tokens} tok` : ""}
    </span>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "min-w-0 cursor-pointer rounded border border-border/45 bg-background/95 px-2 py-1.5 text-left outline-none transition-[box-shadow,background-color,border-color] hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:brightness-[1.04]",
        variant === "main" && "border-violet-400/25 bg-violet-500/[0.04]",
        variant === "talk" && "border-teal-500/25 bg-teal-500/[0.04]",
        variant === "internal" && "border-amber-500/20 bg-amber-500/[0.04]",
        ev.kind === "error" && "border-destructive/30 bg-destructive/[0.04]",
        expanded &&
          "relative z-[1] border-primary/40 bg-background shadow-md ring-2 ring-primary/30 dark:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
            {ev.kind === "error" && (
              <AlertCircle className="size-3 shrink-0 text-destructive" aria-hidden />
            )}
            <span className="font-semibold text-foreground">{ev.from}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium text-foreground/95">{ev.to}</span>
            {ev.to === COMMON_SPACE_ID && (
              <span className="rounded bg-violet-500/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                shared
              </span>
            )}
          </div>
        </div>
        {metaRight}
      </div>
      {hasBody && (
        <div className="mt-1 min-w-0 w-full border-t border-border/30 pt-1">
          {expanded ? (
            <div className="relative">
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "absolute right-1.5 top-1.5 z-[2] rounded border border-border/60 bg-background/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  copied && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
                )}
                style={{ top: 6, right: 6 }}
                aria-label={copied ? "Copied message to clipboard" : "Copy message to clipboard"}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <pre
                className="max-h-[min(50vh,280px)] min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden rounded border border-border/35 bg-muted/40 px-1.5 py-1 pr-14 font-mono text-[10px] leading-snug text-foreground/95"
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                {full}
              </pre>
            </div>
          ) : (
            <p className="line-clamp-2 text-[10px] leading-relaxed text-foreground/88">{full}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function StepMessagesOutline({
  events,
  focusTurn,
  className,
}: {
  events: InteractionEvent[];
  focusTurn: number | null;
  className?: string;
}) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [openThreadKey, setOpenThreadKey] = useState<string | null>(null);
  const { cycles, total } = useMemo(() => {
    if (focusTurn == null) return { cycles: [] as { cycle: number; items: InteractionEvent[] }[], total: 0 };
    const filtered = events
      .filter((e) => e.turn === focusTurn)
      .sort((a, b) => a.cycle - b.cycle || compareEventsChronologically(a, b));
    const map = groupByCycle(filtered);
    const cycleKeys = [...map.keys()].sort((a, b) => a - b);
    const list = cycleKeys.map((cycle) => ({ cycle, items: map.get(cycle)! }));
    return { cycles: list, total: filtered.length };
  }, [events, focusTurn]);

  if (focusTurn == null) return null;

  return (
    <Collapsible
      defaultOpen
      className={cn(
        "step-messages-outline overflow-hidden rounded-lg border border-border/55 bg-gradient-to-b from-muted/35 to-muted/15 shadow-sm",
        className,
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 border-b border-border/40 bg-muted/25 px-2.5 py-2 text-left hover:bg-muted/40">
        <ChevronRight className="step-messages-outline__chev size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
        <Layers className="size-4 shrink-0 text-primary/80" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="text-xs font-semibold tracking-tight text-foreground">Step transcript</span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            Turn <span className="font-semibold tabular-nums text-foreground">{focusTurn}</span>
            {total > 0 ? (
              <>
                {" "}
                · {total} message{total === 1 ? "" : "s"}
                {cycles.length > 1 ? ` · ${cycles.length} cycles` : ""}
              </>
            ) : (
              " · no messages"
            )}
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 pb-2 pt-1.5">
          {total === 0 ? (
            <p className="px-1 py-2 text-[11px] text-muted-foreground">
              No crew interaction events were recorded for this turn in the dataset.
            </p>
          ) : (
            <div className="max-h-[min(340px,50vh)] min-w-0 overflow-y-auto overscroll-contain pr-0.5">
              <div className="space-y-3">
                {cycles.map(({ cycle, items }) => {
                  const { main, talkPairs, internal } = partitionCycleEvents(items);
                  const mainThreadKey = `cycle:${cycle}:main`;
                  const internalThreadKey = `cycle:${cycle}:internal`;
                  return (
                    <section key={cycle} className="step-transcript-cycle">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="rounded bg-primary/12 px-1.5 py-px text-[10px] font-bold tabular-nums text-primary">
                          Cycle {cycle}
                        </span>
                        <span className="h-px flex-1 bg-border/60" aria-hidden />
                        <span className="text-[9px] text-muted-foreground">{items.length} total</span>
                      </div>

                      <div className="min-w-0 space-y-1.5 border-l-2 border-border/50 pl-2">
                        {main.length > 0 && (
                          <Collapsible
                            open={openThreadKey === mainThreadKey}
                            onOpenChange={(nextOpen) =>
                              setOpenThreadKey(nextOpen ? mainThreadKey : null)
                            }
                            className="step-thread step-thread--main group/thread"
                          >
                            <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md border border-violet-400/35 bg-violet-500/[0.08] px-2 py-1.5 text-left hover:bg-violet-500/[0.12]">
                              <ThreadChevron />
                              <Radio className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                              <span className="min-w-0 flex-1 text-[11px] font-semibold text-foreground">
                                Main · Shared deliberation
                              </span>
                              <span className="shrink-0 text-[9px] text-muted-foreground">{main.length}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-1 min-w-0 space-y-1 pl-1">
                                {main.map((ev) => (
                                  <TranscriptRow
                                    key={ev.id}
                                    ev={ev}
                                    variant="main"
                                    expanded={expandedMessageId === ev.id}
                                    onToggle={() => setExpandedMessageId(ev.id)}
                                  />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {talkPairs.map(({ key, endpointA, endpointB, items: msgs }) => {
                          const talkThreadKey = `cycle:${cycle}:talk:${key}`;
                          return (
                          <Collapsible
                            key={key}
                            open={openThreadKey === talkThreadKey}
                            onOpenChange={(nextOpen) =>
                              setOpenThreadKey(nextOpen ? talkThreadKey : null)
                            }
                            className="step-thread step-thread--talk group/thread"
                          >
                            <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md border border-teal-500/30 bg-teal-500/[0.06] px-2 py-1.5 text-left hover:bg-teal-500/[0.1]">
                              <ThreadChevron />
                              <MessagesSquare className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                                <span className="text-muted-foreground">Side ·</span> {endpointA}{" "}
                                <span className="font-normal text-muted-foreground">↔</span> {endpointB}
                              </span>
                              <span className="shrink-0 text-[9px] text-muted-foreground">{msgs.length}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-1 min-w-0 space-y-1 pl-1">
                                {msgs.map((ev) => (
                                  <TranscriptRow
                                    key={ev.id}
                                    ev={ev}
                                    variant="talk"
                                    expanded={expandedMessageId === ev.id}
                                    onToggle={() => setExpandedMessageId(ev.id)}
                                  />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )})}

                        {internal.length > 0 && (
                          <Collapsible
                            open={openThreadKey === internalThreadKey}
                            onOpenChange={(nextOpen) =>
                              setOpenThreadKey(nextOpen ? internalThreadKey : null)
                            }
                            className="step-thread step-thread--internal group/thread"
                          >
                            <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md border border-amber-500/28 bg-amber-500/[0.06] px-2 py-1.5 text-left hover:bg-amber-500/[0.1]">
                              <ThreadChevron />
                              <Wrench className="size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                              <span className="min-w-0 flex-1 text-[11px] font-semibold text-foreground">
                                Internal · Tools &amp; responses
                              </span>
                              <span className="shrink-0 text-[9px] text-muted-foreground">{internal.length}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-1 min-w-0 space-y-1 pl-1">
                                {internal.map((ev) => (
                                  <TranscriptRow
                                    key={ev.id}
                                    ev={ev}
                                    variant="internal"
                                    expanded={expandedMessageId === ev.id}
                                    onToggle={() => setExpandedMessageId(ev.id)}
                                  />
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
