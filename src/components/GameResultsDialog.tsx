import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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
      <DialogContent className="game-results-dialog">
        <DialogHeader className="results-dialog-header shrink-0 space-y-0 pb-0 text-left">
          <DialogTitle className={`flex items-center gap-2 pr-8 text-left text-base ${getResultColor()}`}>
            <Trophy className={`h-5 w-5 shrink-0 ${getResultColor()}`} />
            <span>{getResultText()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="results-dialog-body space-y-3 pb-1">
          <div className="grid grid-cols-2 gap-2.5">
            <Card className="p-3 text-center sm:p-3.5">
              <div className="text-lg font-semibold tabular-nums sm:text-xl">{results.moves}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Moves</div>
            </Card>
            <Card className="p-3 text-center sm:p-3.5">
              <div className="text-lg font-semibold tabular-nums sm:text-xl">{results.durationLabel}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Duration</div>
            </Card>
            <Card className="p-3 text-center sm:p-3.5">
              <div className="text-base font-semibold tabular-nums sm:text-lg">{results.pgnResult}</div>
              <div className="text-xs text-muted-foreground mt-0.5">PGN</div>
            </Card>
            <Card className="p-3 text-center sm:p-3.5">
              <div className="text-base font-semibold tabular-nums sm:text-lg">
                {results.averageLatencyMs === null ? '—' : `${results.averageLatencyMs} ms`}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Avg latency</div>
            </Card>
            <Card className="p-3 text-center sm:p-3.5">
              <div className="text-base font-semibold tabular-nums sm:text-lg">
                {results.finalCentipawnsTotal === null ? '—' : `${results.finalCentipawnsTotal > 0 ? '+' : ''}${results.finalCentipawnsTotal}`}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Final eval</div>
            </Card>
          </div>

          <Card className="p-3.5 sm:p-4">
            <h4 className="mb-2.5 flex items-center gap-2 text-sm font-medium">
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
            <Card className="p-3.5 sm:p-4">
              <h4 className="mb-2.5 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 shrink-0" />
                Key moments
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {results.keyMoments.map((moment, idx) => (
                  <li key={idx} className="flex gap-2 border-l-2 border-primary/30 pl-3 py-0.5">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground/80">{idx + 1}.</span>
                    <span className="min-w-0">{moment}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Button type="button" className="mt-2 w-full" onClick={onRematch}>
            Run again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
