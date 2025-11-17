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
    <div className="inline-block bg-[#312e2b] p-4 rounded-lg shadow-xl">
      <div className="grid grid-cols-[auto_repeat(8,1fr)] gap-0">
        {/* Top file labels */}
        <div className="w-6"></div>
        {files.map((file) => (
          <div key={`top-${file}`} className="h-6 flex items-center justify-center text-[#b58863] text-xs">
            {file}
          </div>
        ))}

        {/* Board rows with rank labels */}
        {board.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {/* Rank label */}
            <div className="w-6 flex items-center justify-center text-[#b58863] text-xs">
              {ranks[rowIndex]}
            </div>
            
            {/* Squares */}
            {row.map((square, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-14 h-14 flex items-center justify-center cursor-pointer
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
                    size={42}
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
