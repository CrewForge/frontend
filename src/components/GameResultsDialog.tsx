import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, Target, Sparkles } from 'lucide-react';

export type GameResultsSummary = {
  winner: 'white' | 'black' | 'draw';
  moves: number;
  durationLabel: string;
  pgnResult: string;
  summaryLine: string;
  keyMoments: string[];
  averageLatencyMs: number | null;
  finalCentipawnsTotal: number | null;
  finalCentipawnsCurrent: number | null;
};

interface GameResultsDialogProps {
  open: boolean;
  onClose: () => void;
  onRematch: () => void;
  results: GameResultsSummary | null;
  mode: 'user' | 'stockfish';
}

export function GameResultsDialog({ open, onClose, onRematch, results, mode }: GameResultsDialogProps) {
  if (!results) return null;

  const getResultText = () => {
    if (results.winner === 'draw') return 'Draw';
    if (mode === 'user') {
      return results.winner === 'white' ? 'You won' : 'AI won';
    }
    return results.winner === 'white' ? 'White wins' : 'Black wins';
  };

  const getResultColor = () => {
    if (results.winner === 'draw') return 'text-muted-foreground';
    if (mode === 'user') {
      return results.winner === 'white' ? 'text-[var(--success)]' : 'text-[var(--destructive)]';
    }
    return 'text-primary';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <Trophy className={`h-6 w-6 shrink-0 ${getResultColor()}`} />
            <span className={getResultColor()}>{getResultText()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card className="p-3 text-center sm:p-4">
              <div className="text-xl font-semibold tabular-nums sm:text-2xl">{results.moves}</div>
              <div className="text-xs text-muted-foreground">Moves</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-xl font-semibold tabular-nums sm:text-2xl">{results.durationLabel}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-semibold tabular-nums sm:text-2xl">{results.pgnResult}</div>
              <div className="text-xs text-muted-foreground">PGN</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-semibold tabular-nums sm:text-2xl">
                {results.averageLatencyMs === null ? '—' : `${results.averageLatencyMs} ms`}
              </div>
              <div className="text-xs text-muted-foreground">Avg latency</div>
            </Card>
            <Card className="p-3 text-center sm:p-4">
              <div className="text-lg font-semibold tabular-nums sm:text-2xl">
                {results.finalCentipawnsTotal === null ? '—' : `${results.finalCentipawnsTotal > 0 ? '+' : ''}${results.finalCentipawnsTotal}`}
              </div>
              <div className="text-xs text-muted-foreground">Final eval</div>
            </Card>
          </div>

          <Card className="p-4 sm:p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium sm:text-base">
              <Target className="h-4 w-4 shrink-0" />
              Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  Outcome
                </Badge>
                <p className="min-w-0 flex-1 text-muted-foreground">
                  {results.summaryLine}
                  {results.finalCentipawnsCurrent !== null && (
                    <> Final move swing: {results.finalCentipawnsCurrent > 0 ? '+' : ''}{results.finalCentipawnsCurrent} centipawns.</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Badge variant="outline" className="shrink-0">
                  Mode
                </Badge>
                <p className="min-w-0 flex-1 text-muted-foreground">
                  {mode === 'user' ? 'Interactive session preview' : 'Automated backend session, observe-only'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Outcome, PGN, and duration are inferred client-side from streamed moves unless the backend sends an explicit summary event.
            </p>
          </Card>

          {results.keyMoments.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium sm:text-base">
                <Sparkles className="h-4 w-4 shrink-0" />
                Key moments
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {results.keyMoments.map((moment, idx) => (
                  <li key={idx} className="flex gap-2 border-l-2 border-primary/30 pl-3">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground/80">{idx + 1}.</span>
                    <span className="min-w-0">{moment}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button onClick={onRematch} className="w-full sm:w-auto">
            Run again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
