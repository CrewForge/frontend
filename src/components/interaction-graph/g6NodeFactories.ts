import type { InteractionGraphNode } from "../../lib/experiments/types";
import type { InteractionNodeTabSummary } from "../../lib/experiments/types";
import type { NodeOutboundDestKind, NodeTurnOutboundLine } from "./interactionCardModel";

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

const PORT_SVG: Record<NodeOutboundDestKind, string> = {
  self: `<svg class="g6-graph-node-card__port-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  common: `<svg class="g6-graph-node-card__port-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></svg>`,
  meta: `<svg class="g6-graph-node-card__port-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  agent: `<svg class="g6-graph-node-card__port-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

function renderTurnOutboundStackHtml(lines: NodeTurnOutboundLine[]): string {
  if (lines.length === 0) {
    return `<div class="g6-graph-node-card__preview g6-graph-node-card__preview--stack">
      <div class="g6-graph-node-card__preview-empty">No outbound this turn</div>
    </div>`;
  }
  const innerClass =
    lines.length > 1
      ? "g6-graph-node-card__preview-stack-inner g6-graph-node-card__preview-stack-inner--many"
      : "g6-graph-node-card__preview-stack-inner";
  const rows = lines
    .map((line) => {
      const title = escapeHtml(`→ ${line.targetId}`);
      return `<div class="g6-graph-node-card__preview-row" title="${title}">
      <div class="g6-graph-node-card__preview-text">${escapeHtml(line.preview)}</div>
      <div class="g6-graph-node-card__preview-rail" aria-hidden="true">
        <span class="g6-graph-node-card__preview-rail-line"></span>
        <span class="g6-graph-node-card__preview-port g6-graph-node-card__preview-port--${line.destKind}">${PORT_SVG[line.destKind]}</span>
      </div>
    </div>`;
    })
    .join("");
  return `<div class="g6-graph-node-card__preview g6-graph-node-card__preview--stack">
    <div class="${innerClass}">${rows}</div>
  </div>`;
}

/** Width/height for G6 `html` node `style.size` (anchor at center). */
export function estimateG6NodeCardSize(turnStack: NodeTurnOutboundLine[] | null): { width: number; height: number } {
  const width = 200;
  let h: number;
  if (turnStack == null) h = 122;
  else if (turnStack.length === 0) h = 118;
  else h = Math.min(300, 90 + turnStack.length * 30);
  return { width: Math.round(width), height: Math.round(h) };
}

export function renderNodeCardHtml(
  node: InteractionGraphNode,
  summaries: InteractionNodeTabSummary[],
  latestPreview: string,
  selfEdgeId?: string | null,
  selfEdgeStepActive?: boolean,
  turnOutboundStack?: NodeTurnOutboundLine[] | null,
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
    ? `<button class="g6-graph-thought-bubble${selfEdgeStepActive ? " g6-graph-thought-bubble--step-active" : ""}" type="button" data-self-edge-id="${escapeHtml(selfEdgeId)}" aria-label="Open self messages for ${escapeHtml(node.label)}">...</button>`
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
      ${
        turnOutboundStack != null
          ? renderTurnOutboundStackHtml(turnOutboundStack)
          : `<div class="g6-graph-node-card__preview">${escapeHtml(latestPreview || previewLine(inbound))}</div>`
      }
    </div>
  `;
}
