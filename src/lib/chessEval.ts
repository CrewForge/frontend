/**
 * Engine evaluation helpers — map centipawns (White’s perspective) to a Lichess-style bar fill
 * and human-readable labels.
 */

/**
 * When |centipawns| ≥ this value, the eval bar is pinned fully to that side (decisive / “game over” scale).
 * ~4 pawns is well past “winning” in engine terms without claiming exact mate.
 */
export const DECISIVE_CENTIPAWNS = 4000;

/** ~Winning chances from centipawns (smooth 0–100, 50 = equal). Pins at ±decisive threshold. */
export function centipawnsToWhiteShare(cp: number): number {
  if (!Number.isFinite(cp)) return 50;
  if (cp >= DECISIVE_CENTIPAWNS) return 100;
  if (cp <= -DECISIVE_CENTIPAWNS) return 0;
  const p = 1 / (1 + Math.exp(-0.0038 * cp));
  // Keep a sliver of both colors at non-extreme evals
  return 5 + p * 90;
}

export function formatEvalPawns(cp: number | undefined | null): string {
  if (cp === undefined || cp === null || Number.isNaN(cp)) return '—';
  const pawns = cp / 100;
  const abs = Math.abs(pawns);
  if (abs >= 10) {
    return `${pawns > 0 ? '+' : ''}${Math.round(pawns)}`;
  }
  const rounded = Math.round(pawns * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

/**
 * Primary readout: two decimal pawns so small eval changes are visible (avoids “stuck” +0.5).
 * Secondary: integer centipawns (matches engine payloads).
 */
export function formatEvalRich(cp: number | undefined | null): { pawns: string; centipawns: string } {
  if (cp === undefined || cp === null || Number.isNaN(cp)) {
    return { pawns: '—', centipawns: '' };
  }
  const pawns = cp / 100;
  const pStr = `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  const cpRounded = Math.round(cp);
  const cpStr = `${cpRounded >= 0 ? '+' : ''}${cpRounded}\u00a0cp`;
  return { pawns: pStr, centipawns: cpStr };
}

export function formatCentipawnDelta(delta: number | undefined | null): string {
  if (delta === undefined || delta === null || Number.isNaN(delta)) return '—';
  const rounded = Math.round(delta);
  if (rounded === 0) return '±0';
  return `${rounded > 0 ? '+' : ''}${rounded} cp`;
}

export function formatPawnDelta(delta: number | undefined | null): string {
  if (delta === undefined || delta === null || Number.isNaN(delta)) return '—';
  const p = delta / 100;
  const rounded = Math.round(p * 10) / 10;
  if (rounded === 0) return '±0.0';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}
