import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <Trophy className="h-6 w-6 shrink-0 text-primary" />
            <span>EvalPlus run complete</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3 text-center sm:p-4">
              <div className="text-xl font-semibold tabular-nums sm:text-2xl">{results.submissions}</div>
              <div className="text-xs text-muted-foreground">Submissions</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-semibold tabular-nums sm:text-2xl">{results.durationLabel}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-semibold tabular-nums sm:text-2xl">
                {results.averageLatencyMs === null ? '—' : `${results.averageLatencyMs} ms`}
              </div>
              <div className="text-xs text-muted-foreground">Avg latency</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-semibold tabular-nums sm:text-2xl">
                {results.totalTokens === null ? '—' : results.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Tokens (sum)</div>
            </Card>
          </div>

          <Card className="p-4 sm:p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium sm:text-base">
              <BarChart3 className="h-4 w-4 shrink-0" />
              Pass@k (from stream / experiment result)
            </h4>
            {results.passAtK && Object.keys(results.passAtK).length > 0 ? (
              <div className="space-y-2">{formatPassRow(results.passAtK)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No pass@k payload on the end event.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{results.summaryLine}</p>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">EvalPlus</Badge>
            <Badge variant="secondary">RunnerMoveRecord → UI</Badge>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button onClick={onRunAgain} className="w-full sm:w-auto">
            Run again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
