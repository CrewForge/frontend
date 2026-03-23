/**
 * Engine evaluation helpers — map centipawns (White’s perspective) to a Lichess-style bar fill
 * and human-readable labels.
 */

/** ~Winning chances from centipawns (smooth 0–100, 50 = equal). */
export function centipawnsToWhiteShare(cp: number): number {
  if (!Number.isFinite(cp)) return 50;
  // Logistic-style curve (similar spirit to analysis UIs)
  const p = 1 / (1 + Math.exp(-0.0038 * cp));
  // Keep a sliver of both colors at extremes so the bar never looks “empty”
  return 5 + p * 90;
}

export function formatEvalPawns(cp: number | undefined | null): string {
  if (cp === undefined || cp === null || Number.isNaN(cp)) return '—';
  const pawns = cp / 100;
  const abs = Math.abs(pawns);
  if (abs >= 99) {
    return pawns > 0 ? '+M' : '−M';
  }
  if (abs >= 10) {
    return `${pawns > 0 ? '+' : ''}${Math.round(pawns)}`;
  }
  const rounded = Math.round(pawns * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}`;
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
