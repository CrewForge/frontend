import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { TrendingUp, TrendingDown, Coins, Zap, Target, Clock } from 'lucide-react';

export interface PerformanceData {
  performanceDelta: number; // Percentage improvement over baseline
  tokenCost: number; // Total tokens consumed
  baselineTokens: number; // Baseline comparison
  taskCompletionRate: number; // Percentage
  averageResponseTime: number; // Seconds
  efficiency: number; // Performance per token
}

interface PerformanceMetricsProps {
  data: PerformanceData;
  showComparison?: boolean;
}

export function PerformanceMetrics({ data, showComparison = true }: PerformanceMetricsProps) {
  const tokenEfficiency = ((data.performanceDelta / data.tokenCost) * 1000).toFixed(2);
  const tokenOverhead = (
    ((data.tokenCost - data.baselineTokens) / data.baselineTokens) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Performance Delta */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Performance Delta</p>
              <div className="flex items-baseline gap-2">
                <h2
                  className={
                    data.performanceDelta > 0
                      ? 'text-[var(--success)]'
                      : 'text-[var(--destructive)]'
                  }
                >
                  {data.performanceDelta > 0 ? '+' : ''}
                  {data.performanceDelta}%
                </h2>
                {data.performanceDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-[var(--success)]" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-[var(--destructive)]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs. single-agent baseline</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
          </div>
          <Progress
            value={Math.min(Math.abs(data.performanceDelta), 100)}
            className="h-2"
          />
        </Card>

        {/* Token Cost */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Token Cost</p>
              <h2>{data.tokenCost.toLocaleString()}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {tokenOverhead > '0' ? '+' : ''}
                {tokenOverhead}% vs baseline
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Coins className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Baseline: {data.baselineTokens.toLocaleString()}</span>
          </div>
        </Card>

        {/* Efficiency */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Efficiency</p>
              <h2>{tokenEfficiency}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                performance per 1K tokens
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
          </div>
          <Badge
            variant={parseFloat(tokenEfficiency) > 1 ? 'default' : 'secondary'}
            className="text-xs"
          >
            {parseFloat(tokenEfficiency) > 1 ? 'Excellent' : 'Good'}
          </Badge>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Task Completion Rate
              </p>
              <h3>{data.taskCompletionRate}%</h3>
            </div>
            <Target className="w-5 h-5 text-primary" />
          </div>
          <Progress value={data.taskCompletionRate} className="h-2" />
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Avg Response Time
              </p>
              <h3>{data.averageResponseTime}s</h3>
            </div>
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Per agent decision cycle</p>
        </Card>
      </div>

      {/* Comparison Chart */}
      {showComparison && (
        <Card className="p-6">
          <h3 className="mb-4">Multi-Agent vs Single-Agent Comparison</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Performance</span>
                <span className="text-[var(--success)]">
                  Multi-Agent: {100 + data.performanceDelta}%
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Progress
                    value={100 + data.performanceDelta}
                    className="h-3 bg-[var(--success)]/20"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12">
                  {100 + data.performanceDelta}%
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2 mt-1">
                <span></span>
                <span className="text-muted-foreground">Baseline: 100%</span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Progress value={100} className="h-3" />
                </div>
                <span className="text-xs text-muted-foreground w-12">100%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Token Usage</span>
                <span className="text-[var(--warning)]">
                  Multi-Agent: {data.tokenCost.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Progress
                    value={Math.min(
                      (data.tokenCost / data.baselineTokens) * 100,
                      100
                    )}
                    className="h-3 bg-[var(--warning)]/20"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12">
                  {tokenOverhead > '0' ? '+' : ''}
                  {tokenOverhead}%
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2 mt-1">
                <span></span>
                <span className="text-muted-foreground">
                  Baseline: {data.baselineTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Progress value={100} className="h-3" />
                </div>
                <span className="text-xs text-muted-foreground w-12">100%</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
