import React, { useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { InteractionEvent } from "../../lib/experiments/types";
import { compareEventsChronologically } from "./interactionCardModel";
import { InteractionMessageRow } from "./InteractionMessagePrimitives";

type TabKey = "inbound" | "outbound" | "self";

function sortEventsWithFocusTurnFirst(
  events: InteractionEvent[],
  focusTurn: number | null,
): InteractionEvent[] {
  if (focusTurn == null || Number.isNaN(Number(focusTurn))) {
    return [...events].sort(compareEventsChronologically);
  }
  const ft = Number(focusTurn);
  const match: InteractionEvent[] = [];
  const rest: InteractionEvent[] = [];
  for (const e of events) {
    (e.turn === ft ? match : rest).push(e);
  }
  match.sort(compareEventsChronologically);
  rest.sort(compareEventsChronologically);
  return [...match, ...rest];
}

function pickDefaultNodeTab(
  groups: {
    inbound: InteractionEvent[];
    outbound: InteractionEvent[];
    self: InteractionEvent[];
  },
  focusTurn: number | null,
): TabKey {
  const ft = focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);

  if (ft != null) {
    const outboundHasCurrentTurn = groups.outbound.some((e) => e.turn === ft);
    if (outboundHasCurrentTurn) return "outbound";
    if (groups.self.length > 0) return "self";
    if (groups.outbound.length > 0) return "outbound";
    return "inbound";
  }

  if (groups.outbound.length > 0) return "outbound";
  if (groups.self.length > 0) return "self";
  return "inbound";
}

export function InCanvasNodeCard({
  nodeId,
  groups,
  focusTurn = null,
  onClose,
}: {
  nodeId: string;
  groups: {
    inbound: InteractionEvent[];
    outbound: InteractionEvent[];
    self: InteractionEvent[];
  };
  /** Evidence / replay turn — reorder and highlight matching messages. */
  focusTurn?: number | null;
  onClose: () => void;
}) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const normalizedFocus =
    focusTurn == null || Number.isNaN(Number(focusTurn)) ? null : Number(focusTurn);
  const defaultTab = useMemo(() => pickDefaultNodeTab(groups, normalizedFocus), [groups, normalizedFocus]);

  const sortedGroups = useMemo(
    () => ({
      inbound: sortEventsWithFocusTurnFirst(groups.inbound, normalizedFocus),
      outbound: sortEventsWithFocusTurnFirst(groups.outbound, normalizedFocus),
      self: sortEventsWithFocusTurnFirst(groups.self, normalizedFocus),
    }),
    [groups, normalizedFocus],
  );

  return (
    <Card className="g6-expand-card g6-expand-card--full pointer-events-auto p-2">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{nodeId}</p>
        <button type="button" className="g6-expand-card__close" onClick={onClose}>
          Close
        </button>
      </div>
      <Tabs key={`${nodeId}-${normalizedFocus ?? "all"}`} defaultValue={defaultTab} className="graph-console-tabs gap-1.5">
        <TabsList className="w-full min-h-0">
          <TabsTrigger value="inbound" className="text-[10px] font-semibold">
            Inbound <Badge variant="outline" className="ml-1 border-border/70 text-[9px]">{groups.inbound.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="outbound" className="text-[10px] font-semibold">
            Outbound <Badge variant="outline" className="ml-1 border-border/70 text-[9px]">{groups.outbound.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="self" className="text-[10px] font-semibold">
            Self <Badge variant="outline" className="ml-1 border-border/70 text-[9px]">{groups.self.length}</Badge>
          </TabsTrigger>
        </TabsList>
        {(["inbound", "outbound", "self"] as const).map((tab) => {
          const list = sortedGroups[tab];
          return (
            <TabsContent key={tab} value={tab} className="g6-expand-card__tab-content">
              <div className="g6-expand-card__scroll space-y-1 pr-0.5">
                {list.map((item) => (
                  <InteractionMessageRow
                    key={`${tab}:${item.id}`}
                    event={item}
                    expanded={expandedMessageId === `${tab}:${item.id}`}
                    onToggle={() =>
                      setExpandedMessageId((prev) =>
                        prev === `${tab}:${item.id}` ? null : `${tab}:${item.id}`,
                      )
                    }
                    focusTurnHighlight={normalizedFocus != null && item.turn === normalizedFocus}
                  />
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
