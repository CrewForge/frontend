import React from 'react';
import { ChessPiece } from './ChessPiece';
import type { PieceKind } from '../lib/chessCaptures';

interface ChessMaterialProps {
  /** Black pieces captured by White (above the board). */
  takenByWhite: PieceKind[];
  /** White pieces captured by Black (below the board). */
  takenByBlack: PieceKind[];
  children: React.ReactNode;
}

function kindToPieceType(k: PieceKind): 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' {
  return k;
}

function MaterialStrip({ kinds, color }: { kinds: PieceKind[]; color: 'white' | 'black' }) {
  if (kinds.length === 0) return <span className="chess-material__empty" />;
  return (
    <>
      {kinds.map((k, i) => (
        <span key={`${k}-${i}`} className="chess-material__glyph">
          <ChessPiece type={kindToPieceType(k)} color={color} compact />
        </span>
      ))}
    </>
  );
}

/**
 * Lichess-style: top strip = pieces White took from Black; bottom = pieces Black took from White.
 * Renders `{children}` (board + eval) between the strips.
 */
export function ChessMaterial({ takenByWhite, takenByBlack, children }: ChessMaterialProps) {
  return (
    <div className="chess-material-wrap" aria-label="Material balance">
      <div className="chess-material__row chess-material__row--top">
        <MaterialStrip kinds={takenByWhite} color="black" />
      </div>
      {children}
      <div className="chess-material__row chess-material__row--bottom">
        <MaterialStrip kinds={takenByBlack} color="white" />
      </div>
    </div>
  );
}
