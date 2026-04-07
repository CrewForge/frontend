import React, { useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Agent } from './AgentCard';

interface FlowChartNode {
  id: string;
  agent: Agent;
  position: { x: number; y: number };
  status: 'thinking' | 'communicating' | 'idle' | 'active';
  currentThought?: string;
}

interface FlowChartConnection {
  from: string;
  to: string;
  label?: string;
  active?: boolean;
}

interface AgentFlowChartProps {
  nodes: FlowChartNode[];
  connections: FlowChartConnection[];
}

export function AgentFlowChart({ nodes, connections }: AgentFlowChartProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const compactConnections = useMemo(
    () =>
      connections
        .map((conn) => {
          const fromNode = nodes.find((node) => node.id === conn.from);
          const toNode = nodes.find((node) => node.id === conn.to);
          if (!fromNode || !toNode) return null;
          return {
            key: `${conn.from}-${conn.to}`,
            from: fromNode.agent.name,
            to: toNode.agent.name,
            label: conn.label ?? 'Signal',
            active: Boolean(conn.active),
          };
        })
        .filter((value): value is { key: string; from: string; to: string; label: string; active: boolean } => Boolean(value)),
    [connections, nodes],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thinking':
        return '#3b82f6';
      case 'communicating':
        return '#22c55e';
      case 'active':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'thinking':
        return 'Analyzing';
      case 'communicating':
        return 'Communicating';
      case 'active':
        return 'Active';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b">
        <h3>Agent activity view</h3>
        <p className="text-sm text-muted-foreground">
          Compact view of the active coordination roles in this dataspace
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {nodes.map((node) => (
              <Card
                key={node.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedNode === node.id ? 'ring-2 shadow-lg' : ''
                }`}
                style={{
                  borderColor: selectedNode === node.id ? node.agent.color : undefined,
                  ringColor: node.agent.color,
                }}
                onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={node.agent.avatar}
                      alt={node.agent.name}
                      className="w-12 h-12 rounded-full object-cover"
                      style={{ border: `2px solid ${node.agent.color}` }}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: getStatusColor(node.status) }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="truncate">{node.agent.name}</span>
                      {node.agent.isMetaAgent && (
                        <Badge
                          className="text-[10px] px-1 py-0"
                          style={{ backgroundColor: node.agent.color }}
                        >
                          META
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{node.agent.role}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${getStatusColor(node.status)}20`,
                      color: getStatusColor(node.status),
                    }}
                  >
                    {getStatusLabel(node.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Illustrative view</span>
                </div>

                {node.currentThought && (
                  <div className="p-2 rounded bg-muted/50 border-l-2" style={{ borderColor: node.agent.color }}>
                    <p className="text-xs">{node.currentThought}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-medium">Communication paths</h4>
                <p className="text-xs text-muted-foreground">
                  Illustrative coordination links for the dataspace layout
                </p>
              </div>
              <Badge variant="outline">{compactConnections.length} links</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {compactConnections.map((connection) => (
                <div
                  key={connection.key}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {connection.from} → {connection.to}
                    </div>
                    <div className="text-xs text-muted-foreground">{connection.label}</div>
                  </div>
                  <Badge variant={connection.active ? 'default' : 'outline'}>
                    {connection.active ? 'Live' : 'Idle'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span>Analyzing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span>Communicating</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#94a3b8' }} />
            <span>Idle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
