import React, { useMemo } from "react";
import type { ExperimentManifestEntry } from "../../lib/experiments/types";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";

type Props = {
  entries: ExperimentManifestEntry[];
  envType: "chess" | "evalplus";
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
};

function formatTime(ts: string | null) {
  if (!ts) return "n/a";
  const t = Date.parse(ts);
  return Number.isFinite(t) ? new Date(t).toLocaleString() : ts;
}

export function ExperimentPicker({ entries, envType, selectedPath, onSelectPath }: Props) {
  const filtered = useMemo(
    () => entries.filter((e) => e.envType === envType),
    [entries, envType],
  );

  const current = filtered.find((e) => e.path === selectedPath) ?? filtered[0] ?? null;

  return (
    <div className="w-full min-w-[240px] space-y-2">
      <Label htmlFor={`experiment-${envType}`} className="text-xs text-muted-foreground">
        Experiment dataset
      </Label>
      <select
        id={`experiment-${envType}`}
        value={current?.path ?? ""}
        onChange={(e) => onSelectPath(e.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        {filtered.map((entry) => (
          <option key={entry.path} value={entry.path}>
            {entry.experimentId} · {entry.systemType}
          </option>
        ))}
      </select>
      {current && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <Badge variant="outline">{current.systemType}</Badge>
          <Badge variant="outline">{current.metaModel ?? "unknown model"}</Badge>
          {current.crewModel ? <Badge variant="outline">{current.crewModel}</Badge> : null}
          <span>moves: {current.totalMoves}</span>
          <span>tokens: {current.totalTokens ?? "n/a"}</span>
          <span>start: {formatTime(current.startedAt)}</span>
        </div>
      )}
    </div>
  );
}
