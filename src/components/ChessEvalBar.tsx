import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  centipawnsToWhiteShare,
  formatCentipawnDelta,
  formatEvalPawns,
  formatPawnDelta,
} from '../lib/chessEval';

export interface ChessEvalBarProps {
  /** Latest engine score in centipawns from White’s perspective (positive = White ahead). */
  centipawnsTotal?: number | null;
  /** Change in evaluation vs previous position (centipawns). */
  evalDeltaCp?: number | null;
  className?: string;
}

export function ChessEvalBar({ centipawnsTotal, evalDeltaCp, className = '' }: ChessEvalBarProps) {
  const reduceMotion = useReducedMotion();

  const whiteShare = useMemo(
    () =>
      typeof centipawnsTotal === 'number' ? centipawnsToWhiteShare(centipawnsTotal) : 50,
    [centipawnsTotal],
  );

  const delta = typeof evalDeltaCp === 'number' ? evalDeltaCp : null;
  const deltaTone =
    delta === null ? 'neutral' : delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';

  return (
    <div
      className={`chess-eval-bar ${className}`.trim()}
      aria-label={`Engine evaluation ${formatEvalPawns(centipawnsTotal ?? undefined)} pawns`}
    >
      <div className="chess-eval-bar__readout">
        <motion.div
          className="chess-eval-bar__main"
          key={centipawnsTotal ?? 'empty'}
          initial={reduceMotion ? false : { opacity: 0.85, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          {formatEvalPawns(centipawnsTotal ?? undefined)}
        </motion.div>
        <div className="chess-eval-bar__sub">pawns</div>

        <motion.div
          className={`chess-eval-bar__delta chess-eval-bar__delta--${deltaTone}`}
          key={delta ?? 'nod'}
          initial={reduceMotion ? false : { opacity: 0.6, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
        >
          <span className="chess-eval-bar__delta-label">Δ move</span>
          <span className="chess-eval-bar__delta-cp">{formatCentipawnDelta(delta)}</span>
          <span className="chess-eval-bar__delta-pawns">({formatPawnDelta(delta)})</span>
        </motion.div>
      </div>

      <div className="chess-eval-bar__track" role="presentation">
        <div className="chess-eval-bar__track-inner">
          {/* Black (bottom) */}
          <div className="chess-eval-bar__black" />
          {/* White (top) — height animates with evaluation */}
          <motion.div
            className="chess-eval-bar__white"
            initial={false}
            animate={{
              height: `${whiteShare}%`,
            }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 140, damping: 22, mass: 0.7 }
            }
          />
          <div className="chess-eval-bar__midline" />
        </div>
        <div className="chess-eval-bar__cap chess-eval-bar__cap--top" aria-hidden />
        <div className="chess-eval-bar__cap chess-eval-bar__cap--bottom" aria-hidden />
      </div>
    </div>
  );
}
