import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, BarChart3 } from 'lucide-react';
import type { EvalPlusPassAtK } from '../lib/evalplusExperiment';

export type EvalPlusResultsSummary = {
  submissions: number;
  durationLabel: string;
  averageLatencyMs: number | null;
  totalTokens: number | null;
  passAtK: EvalPlusPassAtK | null;
  summaryLine: string;
};

type EvalPlusResultsDialogProps = {
  open: boolean;
  onClose: () => void;
  onRunAgain: () => void;
  results: EvalPlusResultsSummary | null;
};

function formatPassRow(pk: EvalPlusPassAtK) {
  return Object.entries(pk)
    .sort(([a], [b]) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))
    .map(([k, v]) => (
      <div key={k} className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{k}</span>
        <span className="font-mono tabular-nums">{typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v)}</span>
      </div>
    ));
}

export function EvalPlusResultsDialog({ open, onClose, onRunAgain, results }: EvalPlusResultsDialogProps) {
  if (!results) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="evalplus-results-dialog">
        <DialogHeader className="results-dialog-header shrink-0 space-y-0 pb-0 text-left">
          <DialogTitle className="flex items-center gap-2 pr-8 text-left text-base">
            <Trophy className="h-5 w-5 shrink-0 text-primary" />
            <span>EvalPlus run complete</span>
          </DialogTitle>
        </DialogHeader>

        <div className="results-dialog-body space-y-2.5 pb-1">
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-2.5 text-center sm:p-3">
              <div className="text-lg font-semibold tabular-nums sm:text-xl">{results.submissions}</div>
              <div className="text-xs text-muted-foreground">Submissions</div>
            </Card>
            <Card className="p-2.5 text-center sm:p-3">
              <div className="text-lg font-semibold tabular-nums sm:text-xl">{results.durationLabel}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </Card>
            <Card className="p-2.5 text-center sm:p-3">
              <div className="text-base font-semibold tabular-nums sm:text-lg">
                {results.averageLatencyMs === null ? '—' : `${results.averageLatencyMs} ms`}
              </div>
              <div className="text-xs text-muted-foreground">Avg latency</div>
            </Card>
            <Card className="p-2.5 text-center sm:p-3">
              <div className="text-base font-semibold tabular-nums sm:text-lg">
                {results.totalTokens === null ? '—' : results.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Tokens (sum)</div>
            </Card>
          </div>

          <Card className="p-3 sm:p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 shrink-0" />
              Pass@k (from stream / experiment result)
            </h4>
            {results.passAtK && Object.keys(results.passAtK).length > 0 ? (
              <div className="space-y-1.5">{formatPassRow(results.passAtK)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No pass@k payload on the end event.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{results.summaryLine}</p>
          </Card>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">EvalPlus</Badge>
            <Badge variant="secondary">RunnerMoveRecord → UI</Badge>
          </div>

          <Button type="button" className="mt-1 w-full" onClick={onRunAgain}>
            Run again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
