import React from 'react';

type StatusType = 'online' | 'idle' | 'offline';

interface AgentAvatarProps {
  src: string;
  name: string;
  size?: 32 | 48 | 72;
  status?: StatusType;
  color?: string;
}

export function AgentAvatar({ src, name, size = 48, status, color }: AgentAvatarProps) {
  const statusColors = {
    online: 'bg-[var(--success)]',
    idle: 'bg-[var(--warning)]',
    offline: 'bg-muted-foreground'
  };

  return (
    <div className="relative inline-block">
      <div 
        className="rounded-full overflow-hidden bg-muted ring-2"
        style={{ 
          width: size, 
          height: size,
          ringColor: color || 'transparent'
        }}
      >
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
      {status && (
        <div 
          className={`absolute bottom-0 right-0 rounded-full border-2 border-background ${statusColors[status]}`}
          style={{ 
            width: size / 4, 
            height: size / 4 
          }}
        />
      )}
    </div>
  );
}
