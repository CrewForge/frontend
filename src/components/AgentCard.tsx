import React from 'react';
import { AgentAvatar } from './AgentAvatar';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Crown } from 'lucide-react';

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  status: 'online' | 'idle' | 'offline';
  confidence: number;
  lastAction: string;
  movesCount: number;
  isMetaAgent?: boolean;
}

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  isSelected?: boolean;
}

export function AgentCard({ agent, onClick, isSelected }: AgentCardProps) {
  return (
    <Card 
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2' : ''} ${agent.isMetaAgent ? 'border-2' : ''}`}
      style={{ 
        ringColor: isSelected ? agent.color : 'transparent',
        borderColor: agent.isMetaAgent ? agent.color : undefined
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <AgentAvatar 
            src={agent.avatar}
            name={agent.name}
            size={48}
            status={agent.status}
            color={agent.color}
          />
          {agent.isMetaAgent && (
            <div 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: agent.color }}
            >
              <Crown className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="truncate">{agent.name}</h4>
            {agent.isMetaAgent && (
              <Badge 
                variant="default"
                className="text-[11px] px-2 py-0"
                style={{ backgroundColor: agent.color }}
              >
                META
              </Badge>
            )}
            <Badge 
              variant="secondary" 
              className="text-[11px] px-2 py-0"
              style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
            >
              {agent.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-3">{agent.role}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Confidence</div>
              <div style={{ color: agent.color }}>{agent.confidence}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Moves</div>
              <div>{agent.movesCount}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-sm">
            <div className="text-muted-foreground mb-1">Last Action</div>
            <div className="text-xs">{agent.lastAction}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
