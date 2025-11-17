import React, { useState } from 'react';
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
        <h3>Agent Interaction Flow</h3>
        <p className="text-sm text-muted-foreground">
          Real-time visualization of agent communication and decision-making
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 relative" style={{ minHeight: '800px' }}>
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
              </marker>
            </defs>

            {/* Draw connections */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.position.x + 140;
              const y1 = fromNode.position.y + 50;
              const x2 = toNode.position.x + 140;
              const y2 = toNode.position.y + 50;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={idx}>
                  <path
                    d={`M ${x1} ${y1} Q ${midX} ${midY - 20} ${x2} ${y2}`}
                    stroke={conn.active ? '#22c55e' : '#94a3b8'}
                    strokeWidth={conn.active ? 2 : 1}
                    fill="none"
                    markerEnd={conn.active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    strokeDasharray={conn.active ? '0' : '5,5'}
                  />
                  {conn.label && (
                    <text
                      x={midX}
                      y={midY - 25}
                      textAnchor="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Draw nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute"
              style={{
                left: `${node.position.x}px`,
                top: `${node.position.y}px`,
                width: '280px',
              }}
            >
              <Card
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedNode === node.id ? 'ring-2' : ''
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
                  <span className="text-xs text-muted-foreground">
                    {node.agent.confidence}% confident
                  </span>
                </div>

                {node.currentThought && (
                  <div className="p-2 rounded bg-muted/50 border-l-2" style={{ borderColor: node.agent.color }}>
                    <p className="text-xs">{node.currentThought}</p>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center gap-6 text-xs">
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
