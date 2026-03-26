import type { InteractionEventKind } from "./types";

/** Turn tool JSON / structured payloads into readable lines for the edge evidence panel. */
export function formatInteractionEvidenceDisplayText(
  text: string,
  kind: InteractionEventKind,
): string {
  const raw = text.trim();
  if (!raw) return "(empty)";
  if (kind !== "tool") return text;

  const t = raw.trim();
  if (!t.startsWith("{")) return text;

  try {
    const obj = JSON.parse(t) as Record<string, unknown>;
    return formatStructuredToolPayload(obj, t);
  } catch {
    return text;
  }
}

function formatStructuredToolPayload(obj: Record<string, unknown>, fallback: string): string {
  const parts: string[] = [];

  if (typeof obj.move === "string" && obj.move.trim()) {
    parts.push(`Move: ${obj.move.trim()}`);
  }
  if (typeof obj.san === "string" && obj.san.trim()) {
    parts.push(`SAN: ${obj.san.trim()}`);
  }
  if (typeof obj.uci === "string" && obj.uci.trim()) {
    parts.push(`UCI: ${obj.uci.trim()}`);
  }
  if (typeof obj.rationale_brief === "string" && obj.rationale_brief.trim()) {
    parts.push(obj.rationale_brief.trim());
  }
  if (typeof obj.rationale === "string" && obj.rationale.trim()) {
    parts.push(obj.rationale.trim());
  }

  const consumed = new Set(["move", "san", "uci", "rationale_brief", "rationale"]);
  for (const [k, v] of Object.entries(obj)) {
    if (consumed.has(k)) continue;
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      parts.push(`${k}: ${String(v)}`);
    }
  }

  if (parts.length > 0) {
    return parts.join("\n\n");
  }

  return JSON.stringify(obj, null, 2);
}
