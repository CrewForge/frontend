import React, { useEffect, useRef } from 'react';
import { renderPiece } from 'chessboard-element/lib/wikipedia-pieces-svg.js';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  /** Smaller glyphs for material strips / legends. */
  compact?: boolean;
}

const TYPE_TO_CODE: Record<PieceType, 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
};

export function ChessPiece({ type, color, compact = false }: ChessPieceProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const pieceId = `${color === 'white' ? 'w' : 'b'}${TYPE_TO_CODE[type]}`;

  useEffect(() => {
    if (!ref.current) return;
    renderPiece(pieceId, ref.current);
  }, [pieceId]);

  return (
    <span
      ref={ref}
      className={`chess-piece-asset ${compact ? 'chess-piece-asset--compact' : ''}`.trim()}
      aria-hidden
    />
  );
}
