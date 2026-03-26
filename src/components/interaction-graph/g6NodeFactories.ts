import type { InteractionGraphNode } from "../../lib/experiments/types";
import type { InteractionNodeTabSummary } from "../../lib/experiments/types";

type NodeKind = "meta" | "agent" | "common";

function nodeKindFor(label: string): NodeKind {
  const normalized = label.toLowerCase();
  if (label === "CommonSpace") return "common";
  if (normalized.includes("meta")) return "meta";
  return "agent";
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function kindLabel(kind: NodeKind) {
  if (kind === "meta") return "meta model";
  if (kind === "common") return "shared memory";
  return "crew";
}

function previewLine(summary: InteractionNodeTabSummary | undefined) {
  if (!summary) return "(none)";
  const text = summary.preview?.trim() || "(none)";
  return text.length > 66 ? `${text.slice(0, 66).trim()}…` : text;
}

export function renderNodeCardHtml(
  node: InteractionGraphNode,
  summaries: InteractionNodeTabSummary[],
  latestPreview: string,
  selfEdgeId?: string | null,
): string {
  const kind = nodeKindFor(node.label);
  const inbound = summaries.find((s) => s.key === "inbound");
  const outbound = summaries.find((s) => s.key === "outbound");
  const self = summaries.find((s) => s.key === "self");
  const classes =
    kind === "meta"
      ? "g6-graph-node-card g6-graph-node-card--meta"
      : kind === "common"
        ? "g6-graph-node-card g6-graph-node-card--common"
        : "g6-graph-node-card g6-graph-node-card--agent";
  const thoughtBubble = selfEdgeId
    ? `<button class="g6-graph-thought-bubble" type="button" data-self-edge-id="${escapeHtml(selfEdgeId)}" aria-label="Open self messages for ${escapeHtml(node.label)}">...</button>`
    : "";
  return `
    <div class="${classes}">
      ${thoughtBubble}
      <div class="g6-graph-node-card__head">
        <div class="g6-graph-node-card__label">${escapeHtml(node.label)}</div>
        <div class="g6-graph-node-card__count">${node.messageCount}</div>
      </div>
      <div class="g6-graph-node-card__kind">${kindLabel(kind)}</div>
      <div class="g6-graph-node-card__tabs">
        <span>In ${inbound?.count ?? 0}</span>
        <span>Out ${outbound?.count ?? 0}</span>
        <span>${escapeHtml(self?.label ?? "self")} ${self?.count ?? 0}</span>
      </div>
      <div class="g6-graph-node-card__preview">${escapeHtml(latestPreview || previewLine(inbound))}</div>
    </div>
  `;
}
