import React from 'react';
import { AgentAvatar } from './AgentAvatar';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  message: string;
  moveNotation?: string;
  expanded?: boolean;
}

interface TimelineMessageProps {
  event: TimelineEvent;
  onClick?: () => void;
  isHighlighted?: boolean;
}

export function TimelineMessage({ event, onClick, isHighlighted }: TimelineMessageProps) {
  return (
    <div 
      className={`
        flex gap-3 p-3.5 rounded-xl cursor-pointer transition-all
        ${isHighlighted ? 'bg-accent' : 'hover:bg-accent/50'}
      `}
      onClick={onClick}
    >
      <div 
        className="w-1 rounded-full flex-shrink-0 self-stretch"
        style={{ backgroundColor: event.agentColor }}
      />
      <AgentAvatar 
        src={event.agentAvatar}
        name={event.agentName}
        size={32}
        color={event.agentColor}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-medium" style={{ color: event.agentColor }}>{event.agentName}</span>
          <span className="text-xs text-muted-foreground">{event.timestamp}</span>
          {event.moveNotation && (
            <span className="text-xs px-2 py-0.5 bg-muted rounded-md font-mono">{event.moveNotation}</span>
          )}
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{event.message}</p>
      </div>
    </div>
  );
}
