import type { Chess } from 'chess.js';

export type PieceKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen';

const ORDER: PieceKind[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

const fromSymbol = (c: string): PieceKind | null => {
  switch (c) {
    case 'p':
      return 'pawn';
    case 'n':
      return 'knight';
    case 'b':
      return 'bishop';
    case 'r':
      return 'rook';
    case 'q':
      return 'queen';
    default:
      return null;
  }
};

function sortCaptured(list: PieceKind[]): PieceKind[] {
  return [...list].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

/**
 * Lichess-style: pieces each side has taken from the opponent (by material type).
 * White’s strip shows black pieces White captured; Black’s strip shows white pieces Black captured.
 */
export function capturedPiecesFromGame(game: Chess): { byWhite: PieceKind[]; byBlack: PieceKind[] } {
  const byWhite: PieceKind[] = [];
  const byBlack: PieceKind[] = [];
  const hist = game.history({ verbose: true });
  for (const m of hist) {
    if (!m.captured) continue;
    const kind = fromSymbol(m.captured);
    if (!kind) continue;
    if (m.color === 'w') {
      byWhite.push(kind);
    } else {
      byBlack.push(kind);
    }
  }
  return { byWhite: sortCaptured(byWhite), byBlack: sortCaptured(byBlack) };
}
