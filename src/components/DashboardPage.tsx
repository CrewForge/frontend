import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Gamepad2, Users, Boxes } from 'lucide-react';

interface DashboardPageProps {
  username: string;
  onEnvironmentSelect: (envId: string) => void;
}

export function DashboardPage({ username, onEnvironmentSelect }: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="flex items-center justify-between mb-2">
          <h1>Welcome back, {username}</h1>
          <Badge variant="secondary" className="text-sm">
            Multi-Agent Research Platform
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Select an environment to begin your multi-agent experiment
        </p>
      </div>

      {/* Environment Selection */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-center mb-12">Environment Selection</h2>
        
        <div className="grid grid-cols-3 gap-8">
          {/* Chess Environment */}
          <Card 
            className="p-12 cursor-pointer transition-all hover:shadow-2xl hover:scale-105 hover:border-primary/50 group"
            onClick={() => onEnvironmentSelect('chess')}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Gamepad2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="mb-3">Chess Strategy</h2>
              <p className="text-muted-foreground mb-6">
                Classic chess game with full rule implementation and strategic depth analysis
              </p>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>Strategy Game</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Complexity:</span>
                  <Badge variant="destructive" className="text-xs">High</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="text-xs">Ready</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Negotiation Environment */}
          <Card 
            className="p-12 cursor-pointer transition-all hover:shadow-2xl hover:scale-105 hover:border-primary/50 group opacity-60"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Users className="w-12 h-12 text-primary" />
              </div>
              <h2 className="mb-3">Negotiation Simulation</h2>
              <p className="text-muted-foreground mb-6">
                Multi-party negotiation scenario with resource allocation and conflict resolution
              </p>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>Social Simulation</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Complexity:</span>
                  <Badge className="text-xs bg-yellow-500">Medium</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Maze Environment */}
          <Card 
            className="p-12 cursor-pointer transition-all hover:shadow-2xl hover:scale-105 hover:border-primary/50 group opacity-60"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Boxes className="w-12 h-12 text-primary" />
              </div>
              <h2 className="mb-3">Collaborative Maze</h2>
              <p className="text-muted-foreground mb-6">
                Team-based maze navigation requiring coordination and path optimization
              </p>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>Coordination Task</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Complexity:</span>
                  <Badge className="text-xs bg-green-500">Low</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-muted/30">
            <h3 className="mb-3">About Multi-Agent Experiments</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Each environment enables testing of dynamic agent teaming. The meta-agent creates and 
              coordinates specialized agents to work together, while the system measures performance 
              deltas against single-agent baselines. Choose an environment above to begin your experiment.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
