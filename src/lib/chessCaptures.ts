import type { Chess } from 'chess.js';

export type PieceKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen';

const ORDER: PieceKind[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
const VALUES: Record<PieceKind, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
};

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

function countByKind(list: PieceKind[]): Record<PieceKind, number> {
  return {
    pawn: list.filter((x) => x === 'pawn').length,
    knight: list.filter((x) => x === 'knight').length,
    bishop: list.filter((x) => x === 'bishop').length,
    rook: list.filter((x) => x === 'rook').length,
    queen: list.filter((x) => x === 'queen').length,
  };
}

function scoreKinds(kinds: PieceKind[]): number {
  return kinds.reduce((sum, k) => sum + VALUES[k], 0);
}

export type MaterialAdvantage = {
  whiteIcons: PieceKind[];
  blackIcons: PieceKind[];
  whitePlus: number;
  blackPlus: number;
};

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

/**
 * Net material edge in Lichess style:
 * - only the side that is ahead shows piece icons + "+N"
 * - score uses standard piece values (P=1, N/B=3, R=5, Q=9)
 */
export function materialAdvantageFromGame(game: Chess): MaterialAdvantage {
  const captured = capturedPiecesFromGame(game);
  const whiteTaken = countByKind(captured.byWhite);
  const blackTaken = countByKind(captured.byBlack);

  const whiteIcons: PieceKind[] = [];
  const blackIcons: PieceKind[] = [];

  for (const kind of ORDER) {
    const diff = whiteTaken[kind] - blackTaken[kind];
    if (diff > 0) {
      for (let i = 0; i < diff; i += 1) whiteIcons.push(kind);
    } else if (diff < 0) {
      for (let i = 0; i < -diff; i += 1) blackIcons.push(kind);
    }
  }

  const whiteIconScore = scoreKinds(whiteIcons);
  const blackIconScore = scoreKinds(blackIcons);
  const net = whiteIconScore - blackIconScore;

  return {
    whiteIcons,
    blackIcons,
    // Show only one +N: whichever side is ahead overall.
    whitePlus: net > 0 ? net : 0,
    blackPlus: net < 0 ? -net : 0,
  };
}
