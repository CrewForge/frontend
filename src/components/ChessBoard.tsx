import React from 'react';
import { ChessPiece } from './ChessPiece';

export type Square = {
  piece?: {
    type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
    color: 'white' | 'black';
  } | null;
  highlight?: 'selected' | 'target' | 'lastMove';
};

export type BoardState = Square[][];

interface ChessBoardProps {
  board: BoardState;
  onSquareClick?: (row: number, col: number) => void;
}

export function ChessBoard({ board, onSquareClick }: ChessBoardProps) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const pieceSize = 46;

  const getSquareColor = (row: number, col: number) => {
    return (row + col) % 2 === 0 ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
  };

  const getHighlightClass = (highlight?: string) => {
    if (highlight === 'selected') return 'ring-4 ring-yellow-400 ring-inset';
    if (highlight === 'target') return 'ring-4 ring-green-400 ring-inset';
    if (highlight === 'lastMove') return 'bg-yellow-200/40';
    return '';
  };

  return (
    <div className="inline-block rounded-2xl bg-[#312e2b] p-3 shadow-xl sm:p-4">
      <div className="grid grid-cols-[auto_repeat(8,1fr)] gap-0">
        {/* Top file labels */}
        <div className="w-5 sm:w-6"></div>
        {files.map((file) => (
          <div
            key={`top-${file}`}
            className="flex h-5 items-center justify-center text-[10px] font-medium text-[#d8c2a1] sm:h-6 sm:text-xs"
          >
            {file}
          </div>
        ))}

        {/* Board rows with rank labels */}
        {board.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {/* Rank label */}
            <div className="flex w-5 items-center justify-center text-[10px] font-medium text-[#d8c2a1] sm:w-6 sm:text-xs">
              {ranks[rowIndex]}
            </div>
            
            {/* Squares */}
            {row.map((square, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  flex h-10 w-10 items-center justify-center cursor-pointer
                  sm:h-12 sm:w-12 md:h-14 md:w-14 xl:h-16 xl:w-16
                  transition-all relative
                  ${getSquareColor(rowIndex, colIndex)}
                  ${getHighlightClass(square.highlight)}
                  hover:opacity-80
                `}
                onClick={() => onSquareClick?.(rowIndex, colIndex)}
              >
                {square.piece && (
                  <ChessPiece
                    type={square.piece.type}
                    color={square.piece.color}
                    size={pieceSize}
                  />
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
