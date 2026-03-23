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
    return (row + col) % 2 === 0 ? 'chess-square--light' : 'chess-square--dark';
  };

  const getHighlightClass = (highlight?: string) => {
    if (highlight === 'selected') return 'chess-square--ring-yellow';
    if (highlight === 'target') return 'chess-square--ring-green';
    if (highlight === 'lastMove') return 'chess-square--last';
    return '';
  };

  return (
    <div className="chess-board-frame">
      <div className="chess-board-grid">
        {/* Top file labels */}
        <div className="chess-board-corner" aria-hidden />
        {files.map((file) => (
          <div key={`top-${file}`} className="chess-board-file-label">
            {file}
          </div>
        ))}

        {board.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <div className="chess-board-rank-label">{ranks[rowIndex]}</div>
            {row.map((square, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`chess-board-square ${getSquareColor(rowIndex, colIndex)} ${getHighlightClass(square.highlight)}`}
                onClick={() => onSquareClick?.(rowIndex, colIndex)}
                role="presentation"
              >
                {square.piece && (
                  <div className="chess-board-piece-wrap">
                    <ChessPiece type={square.piece.type} color={square.piece.color} fluid />
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
