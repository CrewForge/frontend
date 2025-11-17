import React from 'react';
import { Agent } from './AgentCard';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  agent: Agent;
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

interface InteractionGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string;
}

export function InteractionGraph({ nodes, edges, onNodeClick, selectedNodeId }: InteractionGraphProps) {
  return (
    <div className="relative w-full h-[400px] bg-muted/30 rounded-lg border border-border overflow-hidden">
      <svg className="absolute inset-0 w-full h-full">
        {/* Draw edges */}
        {edges.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          return (
            <g key={idx}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={fromNode.agent.color}
                strokeWidth="2"
                opacity="0.3"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(fromNode.x + toNode.x) / 2}
                  y={(fromNode.y + toNode.y) / 2}
                  fill="currentColor"
                  fontSize="10"
                  className="text-muted-foreground"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="currentColor" opacity="0.3" />
          </marker>
        </defs>
      </svg>

      {/* Draw nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          className={`
            absolute transform -translate-x-1/2 -translate-y-1/2 
            cursor-pointer transition-all
            ${selectedNodeId === node.id ? 'scale-110' : 'hover:scale-105'}
          `}
          style={{ left: node.x, top: node.y }}
          onClick={() => onNodeClick?.(node.id)}
        >
          <div 
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              bg-background border-4 shadow-lg
              ${selectedNodeId === node.id ? 'ring-4 ring-offset-2' : ''}
            `}
            style={{ 
              borderColor: node.agent.color,
              ringColor: selectedNodeId === node.id ? node.agent.color : undefined
            }}
          >
            <img 
              src={node.agent.avatar} 
              alt={node.agent.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
          <div 
            className="mt-1 text-center text-xs px-2 py-1 rounded"
            style={{ 
              backgroundColor: `${node.agent.color}20`,
              color: node.agent.color
            }}
          >
            {node.agent.name}
          </div>
        </div>
      ))}
    </div>
  );
}
