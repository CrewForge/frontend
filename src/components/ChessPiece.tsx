import React from 'react';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  size?: number;
  /** Scale with the square (responsive board). */
  fluid?: boolean;
}

export function ChessPiece({ type, color, size = 40, fluid = false }: ChessPieceProps) {
  const fill = color === 'white' ? '#ffffff' : '#1f2937';
  const stroke = color === 'white' ? '#1f2937' : '#ffffff';

  const pieces = {
    king: (
      <g>
        <path d="M20 8 L20 12" stroke={stroke} strokeWidth="2" fill="none"/>
        <path d="M18 10 L22 10" stroke={stroke} strokeWidth="2" fill="none"/>
        <circle cx="20" cy="18" r="6" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M14 28 L26 28 L24 36 L16 36 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
      </g>
    ),
    queen: (
      <g>
        <circle cx="20" cy="12" r="3" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M20 15 L20 20 M15 18 L25 18" stroke={stroke} strokeWidth="2" fill="none"/>
        <path d="M14 24 L26 24 L24 36 L16 36 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
      </g>
    ),
    rook: (
      <g>
        <rect x="16" y="10" width="8" height="4" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M14 14 L26 14 L26 24 L14 24 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M12 24 L28 24 L26 36 L14 36 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
      </g>
    ),
    bishop: (
      <g>
        <circle cx="20" cy="12" r="2.5" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M20 14.5 L15 24 L25 24 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M13 24 L27 24 L25 36 L15 36 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
      </g>
    ),
    knight: (
      <g>
        <path d="M18 12 L22 8 L24 12 L24 20 L16 20 L16 16 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M14 20 L26 20 L24 36 L16 36 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
      </g>
    ),
    pawn: (
      <g>
        <circle cx="20" cy="14" r="4" fill={fill} stroke={stroke} strokeWidth="2"/>
        <path d="M16 18 L24 18 L22 36 L18 36 Z" fill={fill} stroke={stroke} strokeWidth="2"/>
      </g>
    ),
  };

  return (
    <svg
      className={fluid ? 'chess-piece-svg' : undefined}
      width={fluid ? '100%' : size}
      height={fluid ? '100%' : size}
      viewBox="0 0 40 40"
      preserveAspectRatio="xMidYMid meet"
    >
      {pieces[type]}
    </svg>
  );
}
