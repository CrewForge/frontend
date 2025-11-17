import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Gamepad2, Users, Brain, ChevronRight } from 'lucide-react';

export interface Environment {
  id: string;
  name: string;
  description: string;
  type: string;
  complexity: 'Low' | 'Medium' | 'High';
  icon: React.ElementType;
  status: 'ready' | 'beta' | 'coming-soon';
}

interface EnvironmentSelectorProps {
  environments: Environment[];
  onSelect: (envId: string) => void;
}

export function EnvironmentSelector({ environments, onSelect }: EnvironmentSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {environments.map((env) => {
        const Icon = env.icon;
        const isDisabled = env.status === 'coming-soon';
        
        return (
          <Card
            key={env.id}
            className={`p-6 transition-all ${
              isDisabled
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:shadow-lg hover:border-primary/50 cursor-pointer'
            }`}
            onClick={() => !isDisabled && onSelect(env.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <Badge
                variant={
                  env.status === 'ready'
                    ? 'default'
                    : env.status === 'beta'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {env.status === 'ready'
                  ? 'Ready'
                  : env.status === 'beta'
                  ? 'Beta'
                  : 'Coming Soon'}
              </Badge>
            </div>

            <h3 className="mb-2">{env.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{env.description}</p>

            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Type: </span>
                <span>{env.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Complexity: </span>
                <span
                  className={
                    env.complexity === 'High'
                      ? 'text-[var(--destructive)]'
                      : env.complexity === 'Medium'
                      ? 'text-[var(--warning)]'
                      : 'text-[var(--success)]'
                  }
                >
                  {env.complexity}
                </span>
              </div>
            </div>

            {!isDisabled && (
              <Button variant="ghost" className="w-full mt-4 gap-2" size="sm">
                Select Environment
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
