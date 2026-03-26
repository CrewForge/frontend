import React, { useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { InteractionEdgeLike } from "./interactionCardModel";
import { buildEdgeCardModel } from "./interactionCardModel";
import { InteractionMessageRow, formatWhen } from "./InteractionMessagePrimitives";

export function InCanvasEdgeCard({
  edge,
  focusTurn,
  onClose,
}: {
  edge: InteractionEdgeLike;
  focusTurn: number | null | undefined;
  onClose: () => void;
}) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const model = useMemo(() => buildEdgeCardModel(edge, focusTurn), [edge, focusTurn]);
  if (!model) return null;
  return (
    <Card className="g6-expand-card g6-expand-card--full pointer-events-auto p-2">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">
            {model.source} → {model.target}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Last activity: {formatWhen(model.lastTimestamp)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            {model.weight} msgs
          </Badge>
          <button type="button" className="g6-expand-card__close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <Tabs defaultValue="current" className="graph-console-tabs gap-1.5">
        <TabsList className="w-full min-h-0">
          <TabsTrigger value="current" className="text-[10px] font-semibold">
            Current ({model.currentTurnMessages.length})
          </TabsTrigger>
          <TabsTrigger value="other" className="text-[10px] font-semibold">
            Other ({model.otherTurnMessages.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-[10px] font-semibold">
            All ({model.allMessages.length})
          </TabsTrigger>
        </TabsList>
        {(["current", "other", "all"] as const).map((tab) => {
          const list =
            tab === "current"
              ? model.currentTurnMessages
              : tab === "other"
                ? model.otherTurnMessages
                : model.allMessages;
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
