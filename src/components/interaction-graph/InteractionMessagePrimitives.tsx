import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";
import { formatInteractionEvidenceDisplayText } from "../../lib/experiments/interactionEvidenceFormat";
import type { InteractionEvent } from "../../lib/experiments/types";

const PREVIEW_CHARS = 140;

function previewText(text: string) {
  const t = text.trim() || "(empty)";
  if (t.length <= PREVIEW_CHARS) return t;
  return `${t.slice(0, PREVIEW_CHARS).trim()}…`;
}

export function formatWhen(ts: number) {
  if (!ts) return "n/a";
  return new Date(ts).toLocaleString();
}

export function InteractionMessageRow({
  event,
  expanded,
  onToggle,
  tone = "default",
  focusTurnHighlight = false,
}: {
  event: InteractionEvent;
  expanded: boolean;
  onToggle: () => void;
  tone?: "default" | "main" | "talk" | "internal";
  /** Replay / evidence focus: emphasize messages for the active turn. */
  focusTurnHighlight?: boolean;
}) {
  const full = formatInteractionEvidenceDisplayText(event.text, event.kind);
  const hasBody = full.trim().length > 0;
  const [copied, setCopied] = useState(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    },
    [],
  );

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!full.trim()) return;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
    } catch {
      return;
    }
    if (copyResetTimeoutRef.current) clearTimeout(copyResetTimeoutRef.current);
    copyResetTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copyResetTimeoutRef.current = null;
    }, 1400);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "min-w-0 w-full cursor-pointer rounded-md border border-border/60 bg-background/95 px-2 py-1.5 text-left text-xs shadow-sm transition hover:border-primary/35 hover:bg-muted/30",
        expanded && "ring-1 ring-primary/30",
        focusTurnHighlight && "interaction-message-row--focus-turn",
        tone === "main" && "border-violet-400/30 bg-violet-500/[0.05]",
        tone === "talk" && "border-teal-500/28 bg-teal-500/[0.05]",
        tone === "internal" && "border-amber-500/28 bg-amber-500/[0.05]",
        event.kind === "error" && "border-destructive/35 bg-destructive/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="mb-0.5 min-w-0 flex flex-1 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] text-muted-foreground">
          {event.kind === "error" ? <AlertCircle className="size-3 shrink-0 text-destructive" /> : null}
          <span className="font-semibold text-foreground">{event.from}</span>
          <span>→</span>
          <span className="font-medium text-foreground/95">{event.to}</span>
          <Badge variant="outline" className="text-[9px] uppercase">
            {event.kind}
          </Badge>
          <span>turn {event.turn}</span>
          <span>cycle {event.cycle}</span>
        </div>
        {expanded && hasBody ? (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "shrink-0 rounded border border-border/65 bg-background/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground",
              copied && "border-emerald-500/45 text-emerald-600 dark:text-emerald-400",
            )}
            aria-label={copied ? "Copied message to clipboard" : "Copy message to clipboard"}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>
      {hasBody ? (
        expanded ? (
          <div className="relative mt-1 min-w-0 max-w-full overflow-hidden rounded border border-border/45 bg-muted/35 p-1.5">
            <pre
              className="max-h-[220px] block min-w-0 w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-foreground/95"
              style={{ overflowWrap: "anywhere", wordBreak: "break-all" }}
            >
              {full}
            </pre>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-[1.35] text-foreground/90">
            {previewText(full)}
          </p>
        )
      ) : null}
      {hasBody && full.length > PREVIEW_CHARS ? (
        <span className="mt-0.5 block text-[10px] font-medium text-primary">
          {expanded ? "Click to collapse" : "Click to expand"}
        </span>
      ) : null}
    </div>
  );
}
