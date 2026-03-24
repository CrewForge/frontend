import React from 'react';
import { ChessPiece } from './ChessPiece';
import type { PieceKind } from '../lib/chessCaptures';

interface ChessMaterialProps {
  whiteIcons: PieceKind[];
  blackIcons: PieceKind[];
  whitePlus: number;
  blackPlus: number;
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
 * Lichess-style: only show net material edge (icons + +N) for the side that is ahead.
 * Renders `{children}` (board + eval) between the strips.
 */
export function ChessMaterial({
  whiteIcons,
  blackIcons,
  whitePlus,
  blackPlus,
  children,
}: ChessMaterialProps) {
  return (
    <div className="chess-material-wrap" aria-label="Material balance">
      {/* Top = Black’s side (rank 8): Black’s net advantage (pieces White captured appear as white glyphs) */}
      <div className="chess-material__row chess-material__row--top">
        <MaterialStrip kinds={blackIcons} color="white" />
        {blackPlus > 0 ? <span className="chess-material__plus">+{blackPlus}</span> : null}
      </div>
      {children}
      {/* Bottom = White’s side (rank 1): White’s net advantage (Black’s pieces captured as black glyphs) */}
      <div className="chess-material__row chess-material__row--bottom">
        <MaterialStrip kinds={whiteIcons} color="black" />
        {whitePlus > 0 ? <span className="chess-material__plus">+{whitePlus}</span> : null}
      </div>
    </div>
  );
}
