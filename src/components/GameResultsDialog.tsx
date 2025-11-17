import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, Target, Clock, Zap } from 'lucide-react';

interface GameResults {
  winner: 'white' | 'black' | 'draw';
  moves: number;
  duration: string;
  performanceDelta: number;
  tokensCost: number;
  keyMoments: string[];
}

interface GameResultsDialogProps {
  open: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onRematch: () => void;
  results: GameResults;
  mode: 'user' | 'stockfish';
}

export function GameResultsDialog({
  open,
  onClose,
  onViewDetails,
  onRematch,
  results,
  mode,
}: GameResultsDialogProps) {
  const getResultText = () => {
    if (results.winner === 'draw') return 'Game Draw';
    if (mode === 'user') {
      return results.winner === 'white' ? 'You Won!' : 'AI Won';
    }
    return results.winner === 'white' ? 'White Wins' : 'Black Wins';
  };

  const getResultColor = () => {
    if (results.winner === 'draw') return 'text-muted-foreground';
    if (mode === 'user') {
      return results.winner === 'white' ? 'text-[var(--success)]' : 'text-[var(--destructive)]';
    }
    return 'text-primary';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Trophy className={`w-6 h-6 ${getResultColor()}`} />
            <span className={getResultColor()}>{getResultText()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl mb-1">{results.moves}</div>
              <div className="text-xs text-muted-foreground">Moves</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl mb-1">{results.duration}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </Card>
            <Card className="p-4 text-center">
              <div className={`text-2xl mb-1 ${results.performanceDelta > 0 ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                {results.performanceDelta > 0 ? '+' : ''}{results.performanceDelta}%
              </div>
              <div className="text-xs text-muted-foreground">Performance Δ</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl mb-1">{results.tokensCost}</div>
              <div className="text-xs text-muted-foreground">Tokens</div>
            </Card>
          </div>

          {/* Game Summary */}
          <Card className="p-6">
            <h4 className="mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Game Summary
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">Result</Badge>
                <div className="flex-1">
                  <p className="text-sm">
                    {results.winner === 'draw' 
                      ? 'The game ended in a draw after ' + results.moves + ' moves.'
                      : `${results.winner === 'white' ? 'White' : 'Black'} emerged victorious after a ${results.duration} battle.`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">Mode</Badge>
                <div className="flex-1">
                  <p className="text-sm">
                    {mode === 'user' 
                      ? 'User vs Multi-Agent System'
                      : 'Multi-Agent System vs Stockfish'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">Performance</Badge>
                <div className="flex-1">
                  <p className="text-sm">
                    The multi-agent system showed a {Math.abs(results.performanceDelta)}% {results.performanceDelta > 0 ? 'improvement' : 'deficit'} compared to baseline single-agent performance.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Moments */}
          <Card className="p-6">
            <h4 className="mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Key Moments
            </h4>
            <ul className="space-y-2">
              {results.keyMoments.map((moment, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-muted-foreground min-w-[60px]">Move {Math.floor(idx * results.moves / results.keyMoments.length)}:</span>
                  <span>{moment}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={onViewDetails}>
            View Detailed Results
          </Button>
          <Button onClick={onRematch}>
            Rematch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
