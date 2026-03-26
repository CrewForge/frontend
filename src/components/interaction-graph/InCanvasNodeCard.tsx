import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { InteractionEvent } from "../../lib/experiments/types";
import { InteractionMessageRow } from "./InteractionMessagePrimitives";

export function InCanvasNodeCard({
  nodeId,
  groups,
  onClose,
}: {
  nodeId: string;
  groups: {
    inbound: InteractionEvent[];
    outbound: InteractionEvent[];
    self: InteractionEvent[];
  };
  onClose: () => void;
}) {
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  return (
    <Card className="g6-expand-card g6-expand-card--full pointer-events-auto p-2">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{nodeId}</p>
        <button type="button" className="g6-expand-card__close" onClick={onClose}>
          Close
        </button>
      </div>
      <Tabs defaultValue="inbound" className="gap-1">
        <TabsList className="h-7 w-full rounded-md p-0.5">
          <TabsTrigger value="inbound" className="h-6 text-[10px]">
            Inbound <Badge variant="outline" className="ml-1 text-[9px]">{groups.inbound.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="outbound" className="h-6 text-[10px]">
            Outbound <Badge variant="outline" className="ml-1 text-[9px]">{groups.outbound.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="self" className="h-6 text-[10px]">
            Self <Badge variant="outline" className="ml-1 text-[9px]">{groups.self.length}</Badge>
          </TabsTrigger>
        </TabsList>
        {(["inbound", "outbound", "self"] as const).map((tab) => {
          const list = groups[tab];
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
