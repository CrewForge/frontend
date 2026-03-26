import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Clock, CheckCircle, AlertCircle, XCircle, Activity } from 'lucide-react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'agent' | 'environment' | 'user' | 'watchdog';
  message: string;
  details?: string;
  agentId?: string;
}

interface AuditLogProps {
  entries: AuditEntry[];
  compact?: boolean;
}

export function AuditLog({ entries, compact = false }: AuditLogProps) {
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-[var(--success)]" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-[var(--warning)]" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-[var(--destructive)]" />;
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'border-l-[var(--success)]';
      case 'warning':
        return 'border-l-[var(--warning)]';
      case 'error':
        return 'border-l-[var(--destructive)]';
      default:
        return 'border-l-primary';
    }
  };

  const filteredEntries = {
    all: entries,
    system: entries.filter((e) => e.category === 'system'),
    agent: entries.filter((e) => e.category === 'agent'),
    watchdog: entries.filter((e) => e.category === 'watchdog'),
  };

  const renderEntries = (entriesList: AuditEntry[]) => (
    <ScrollArea className={compact ? 'h-[300px]' : 'h-[500px]'}>
      <div className="space-y-2 pr-4">
        {entriesList.map((entry) => (
          <div
            key={entry.id}
            className={`p-3.5 rounded-xl border-l-4 bg-muted/30 ${getLevelColor(
              entry.level
            )}`}
          >
            <div className="flex items-start gap-3">
              {getLevelIcon(entry.level)}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {entry.timestamp}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {entry.category}
                  </Badge>
                  {entry.agentId && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.agentId}
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{entry.message}</p>
                {entry.details && !compact && (
                  <p className="text-xs text-muted-foreground mt-1.5 font-mono leading-relaxed">
                    {entry.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  if (compact) {
    return <div>{renderEntries(entries)}</div>;
  }

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3>Audit Log</h3>
          <Badge variant="secondary">{entries.length} entries</Badge>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-4 mb-5">
          <TabsTrigger value="all">
            All ({filteredEntries.all.length})
          </TabsTrigger>
          <TabsTrigger value="system">
            System ({filteredEntries.system.length})
          </TabsTrigger>
          <TabsTrigger value="agent">
            Agents ({filteredEntries.agent.length})
          </TabsTrigger>
          <TabsTrigger value="watchdog">
            Watch-dog ({filteredEntries.watchdog.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">{renderEntries(filteredEntries.all)}</TabsContent>
        <TabsContent value="system">{renderEntries(filteredEntries.system)}</TabsContent>
        <TabsContent value="agent">{renderEntries(filteredEntries.agent)}</TabsContent>
        <TabsContent value="watchdog">{renderEntries(filteredEntries.watchdog)}</TabsContent>
      </Tabs>
    </Card>
  );
}
