import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Gamepad2, Users, Boxes, LogOut } from 'lucide-react';

interface DashboardPageProps {
  username: string;
  token: string;
  onLogout: () => void | Promise<void>;
  onEnvironmentSelect: (envId: string) => void;
}

export function DashboardPage({ username, token, onLogout, onEnvironmentSelect }: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-8">
      <div className="dashboard-shell mb-8 sm:mb-10">
        <div className="dashboard-header-card p-5 sm:p-6">
          <div className="dashboard-header-row mb-2">
            <div className="dashboard-header-copy">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {username}</h1>
              <p className="mt-1 text-muted-foreground">Choose an environment view for the workspace.</p>
            </div>
            <div className="dashboard-header-actions">
              <Badge variant="secondary" className="text-sm">
                Workspace
              </Badge>
              <Button variant="outline" size="sm" onClick={() => void onLogout()} disabled={!token}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-shell">
        <h2 className="mb-8 text-center text-xl font-semibold sm:mb-12 sm:text-2xl">Environments</h2>
        <p className="mx-auto mb-8 max-w-3xl text-center text-sm text-muted-foreground">
          The current release includes one active environment. Additional environments are staged and will unlock in future updates.
        </p>

        <div className="dashboard-env-grid">
          <Card
            className="dashboard-env-card group cursor-pointer p-6 transition-all hover:scale-[1.01] hover:border-primary/50 hover:shadow-lg"
            onClick={() => onEnvironmentSelect('chess')}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Gamepad2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="dashboard-env-title mb-2">Strategy Workspace</h2>
              <p className="dashboard-env-description mb-4">
                Review structured session output, replay prepared results, and connect to a live backend stream when available.
              </p>
              <div className="flex w-full flex-col gap-2">
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Type</span>
                  <span>Structured environment</span>
                </div>
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Complexity</span>
                  <Badge variant="destructive" className="text-xs">High</Badge>
                </div>
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Status</span>
                  <Badge variant="default" className="text-xs">Available</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="dashboard-env-card group cursor-not-allowed border-dashed p-6 opacity-70" aria-disabled="true">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="dashboard-env-title mb-2">Negotiation Simulation</h2>
              <p className="dashboard-env-description mb-4">
                Shared decision-making environment for structured negotiation workflows.
              </p>
              <div className="flex w-full flex-col gap-2">
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Type</span>
                  <span>Social Simulation</span>
                </div>
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Complexity</span>
                  <Badge className="text-xs bg-yellow-500">Medium</Badge>
                </div>
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="dashboard-env-card group cursor-not-allowed border-dashed p-6 opacity-70" aria-disabled="true">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Boxes className="h-8 w-8 text-primary" />
              </div>
              <h2 className="dashboard-env-title mb-2">Collaborative Maze</h2>
              <p className="dashboard-env-description mb-4">
                Multi-agent coordination environment for planning, routing, and shared execution.
              </p>
              <div className="flex w-full flex-col gap-2">
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Type</span>
                  <span>Coordination Task</span>
                </div>
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Complexity</span>
                  <Badge className="text-xs bg-green-500">Low</Badge>
                </div>
                <div className="dashboard-meta-row">
                  <span className="font-medium text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Card className="dashboard-header-card bg-muted/30 p-6">
            <h3 className="mb-3">Platform rollout</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              The workspace is designed to support multiple environments behind a consistent results and telemetry experience. Additional modules will appear here as they become available.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
