import React from 'react';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  size?: number;
  /** Scale with the square (responsive board). */
  fluid?: boolean;
  /** Smaller glyphs for material strips / legends. */
  compact?: boolean;
}

/** Conventional Unicode chess symbols (standard fonts render these as classic piece shapes). */
const WHITE: Record<PieceType, string> = {
  king: '\u2654',
  queen: '\u2655',
  rook: '\u2656',
  bishop: '\u2657',
  knight: '\u2658',
  pawn: '\u2659',
};

const BLACK: Record<PieceType, string> = {
  king: '\u265a',
  queen: '\u265b',
  rook: '\u265c',
  bishop: '\u265d',
  knight: '\u265e',
  pawn: '\u265f',
};

export function ChessPiece({ type, color, fluid = false, compact = false }: ChessPieceProps) {
  const sym = color === 'white' ? WHITE[type] : BLACK[type];
  return (
    <span
      className={[
        'chess-piece-glyph',
        fluid ? 'chess-piece-glyph--fluid' : '',
        compact ? 'chess-piece-glyph--compact' : '',
        color === 'white' ? 'chess-piece-glyph--white' : 'chess-piece-glyph--black',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      {sym}
    </span>
  );
}
