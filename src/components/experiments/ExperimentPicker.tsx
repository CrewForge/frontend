import React, { useMemo } from "react";
import type { ExperimentManifestEntry } from "../../lib/experiments/types";

type Props = {
  entries: ExperimentManifestEntry[];
  envType: "chess" | "evalplus";
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
};

/** Maps raw system_type prefixes to user-friendly labels. */
function cleanSystemType(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase().replace(/[_-]/g, " ").trim();
  if (lower.startsWith("multi agent") || lower.startsWith("multi_agent")) return "Crew System";
  if (lower.startsWith("single")) return "Normal LLM";
  // Title case fallback
  return raw
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Maps raw model identifiers to clean display names. */
function cleanModelName(raw: string | null | undefined): string {
  if (!raw) return "";
  const lower = raw.toLowerCase().replace(/[_-]/g, " ").trim();

  // Gemini family
  if (/gemini.?3\.1.?pro/i.test(raw)) return "Gemini 3.1 Pro";
  if (/gemini.?3\.1.?flash.?lite/i.test(raw)) return "Gemini 3.1 Flash Lite";
  if (/gemini.?3\.1.?flash/i.test(raw)) return "Gemini 3.1 Flash";
  if (/gemini.?3.?flash.?lite/i.test(raw)) return "Gemini 3 Flash Lite";
  if (/gemini.?3.?flash/i.test(raw)) return "Gemini 3 Flash";
  if (/gemini.?3.?pro/i.test(raw)) return "Gemini 3 Pro";

  // Generic cleanup: drop "-preview" suffix, title case
  return raw
    .replace(/-preview$/i, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Build a user-friendly label for the dropdown option. */
function buildOptionLabel(entry: ExperimentManifestEntry): string {
  const system = cleanSystemType(entry.systemType);
  const parts: string[] = [system];

  const meta = cleanModelName(entry.metaModel);
  if (meta) parts.push(meta);

  const crew = cleanModelName(entry.crewModel);
  if (crew && crew !== meta) parts.push(`+ ${crew}`);

  // Append run number if experimentId ends with _N
  const runMatch = entry.experimentId.match(/_(\d+)$/);
  if (runMatch) parts.push(`#${runMatch[1]}`);

  return parts.join(" · ");
}

export function ExperimentPicker({ entries, envType, selectedPath, onSelectPath }: Props) {
  const filtered = useMemo(
    () => entries.filter((e) => e.envType === envType),
    [entries, envType],
  );

  const current = filtered.find((e) => e.path === selectedPath) ?? filtered[0] ?? null;

  return (
    <div className="w-full max-w-xs min-w-[200px]">
      <select
        id={`experiment-${envType}`}
        value={current?.path ?? ""}
        onChange={(e) => onSelectPath(e.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        aria-label="Experiment dataset"
      >
        {filtered.map((entry) => (
          <option key={entry.path} value={entry.path}>
            {buildOptionLabel(entry)}
          </option>
        ))}
      </select>
    </div>
  );
}
