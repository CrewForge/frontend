import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChessPiece } from './ChessPiece';

export type Square = {
  piece?: {
    type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
    color: 'white' | 'black';
  } | null;
  highlight?: 'selected' | 'target' | 'lastFrom' | 'lastTo';
};

export type BoardState = Square[][];

export type BoardMoveAnimation = {
  from: string;
  to: string;
  pieceType: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  pieceColor: 'white' | 'black';
  capturedType?: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  capturedColor?: 'white' | 'black';
  /** When true, animate captured piece flying from `to` (false for en passant). */
  victimFly: boolean;
};

interface ChessBoardProps {
  board: BoardState;
  onSquareClick?: (row: number, col: number) => void;
  moveAnim?: BoardMoveAnimation | null;
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

function squareName(rowIndex: number, colIndex: number): string {
  return `${files[colIndex]}${8 - rowIndex}`;
}

function shouldHidePiece(square: string, anim: BoardMoveAnimation | null | undefined): boolean {
  if (!anim) return false;
  if (square === anim.from) return true;
  if (anim.victimFly && anim.capturedType && square === anim.to) return true;
  return false;
}

export function ChessBoard({ board, onSquareClick, moveAnim = null }: ChessBoardProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [metrics, setMetrics] = useState<{
    from: { left: number; top: number; width: number; height: number };
    to: { left: number; top: number; width: number; height: number };
  } | null>(null);

  useLayoutEffect(() => {
    if (!moveAnim || !frameRef.current) {
      setMetrics(null);
      return;
    }
    const frame = frameRef.current;
    const fromEl = frame.querySelector<HTMLElement>(`[data-square="${moveAnim.from}"]`);
    const toEl = frame.querySelector<HTMLElement>(`[data-square="${moveAnim.to}"]`);
    if (!fromEl || !toEl) {
      setMetrics(null);
      return;
    }
    const fr = frame.getBoundingClientRect();
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    setMetrics({
      from: { left: a.left - fr.left, top: a.top - fr.top, width: a.width, height: a.height },
      to: { left: b.left - fr.left, top: b.top - fr.top, width: b.width, height: b.height },
    });
  }, [moveAnim]);

  const getSquareColor = (row: number, col: number) => {
    return (row + col) % 2 === 0 ? 'chess-square--light' : 'chess-square--dark';
  };

  const getHighlightClass = (highlight?: string) => {
    if (highlight === 'selected') return 'chess-square--ring-yellow';
    if (highlight === 'target') return 'chess-square--ring-green';
    if (highlight === 'lastFrom') return 'chess-square--last-from';
    if (highlight === 'lastTo') return 'chess-square--last-to';
    return '';
  };

  const dx = metrics ? metrics.to.left - metrics.from.left : 0;
  const dy = metrics ? metrics.to.top - metrics.from.top : 0;

  return (
    <div className="chess-board-frame" ref={frameRef}>
      <div className="chess-board-grid">
        <div className="chess-board-corner" aria-hidden />
        {files.map((file) => (
          <div key={`top-${file}`} className="chess-board-file-label">
            {file}
          </div>
        ))}

        {board.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <div className="chess-board-rank-label">{ranks[rowIndex]}</div>
            {row.map((square, colIndex) => {
              const sq = squareName(rowIndex, colIndex);
              const hide =
                shouldHidePiece(sq, moveAnim) && !!metrics && !!moveAnim;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  data-square={sq}
                  className={`chess-board-square ${getSquareColor(rowIndex, colIndex)} ${getHighlightClass(square.highlight)}`}
                  onClick={() => onSquareClick?.(rowIndex, colIndex)}
                  role="presentation"
                >
                  {square.piece && !hide && (
                    <div className="chess-board-piece-wrap">
                      <ChessPiece type={square.piece.type} color={square.piece.color} />
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {moveAnim && metrics && !reduceMotion && (
        <div className="chess-board-overlay" aria-hidden>
          <motion.div
            className="chess-board-overlay-piece chess-board-overlay-piece--mover"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: dx, y: dy, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.65 }}
            style={{
              left: metrics.from.left,
              top: metrics.from.top,
              width: metrics.from.width,
              height: metrics.from.height,
            }}
          >
            <div className="chess-board-piece-wrap chess-board-piece-wrap--overlay">
              <ChessPiece type={moveAnim.pieceType} color={moveAnim.pieceColor} />
            </div>
          </motion.div>

          {moveAnim.victimFly && moveAnim.capturedType && moveAnim.capturedColor && (
            <motion.div
              className="chess-board-overlay-piece chess-board-overlay-piece--victim"
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: -Math.min(140, metrics.from.width * 2.2), y: 8, opacity: 0, rotate: -14 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{
                left: metrics.to.left,
                top: metrics.to.top,
                width: metrics.to.width,
                height: metrics.to.height,
              }}
            >
              <div className="chess-board-piece-wrap chess-board-piece-wrap--overlay">
                <ChessPiece type={moveAnim.capturedType} color={moveAnim.capturedColor} />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
