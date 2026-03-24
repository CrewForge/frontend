import React, { useEffect, useMemo, useRef } from 'react';

export type ChessMoveListEntry = {
  ply: number;
  san: string;
  uci: string;
  player?: string;
};

interface ChessMoveListProps {
  entries: ChessMoveListEntry[];
  className?: string;
}

/** Pair White / Black moves for display (move numbers like Lichess). */
export function ChessMoveList({ entries, className = '' }: ChessMoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [entries.length]);

  const rows = useMemo(() => {
    const out: { num: number; white?: ChessMoveListEntry; black?: ChessMoveListEntry }[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      out.push({
        num: Math.floor(i / 2) + 1,
        white: entries[i],
        black: entries[i + 1],
      });
    }
    return out;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className={`chess-movelist chess-movelist--empty ${className}`.trim()}>
        <p className="chess-movelist__empty">Moves will appear here as the session streams.</p>
      </div>
    );
  }

  return (
    <div className={`chess-movelist ${className}`.trim()}>
      <div className="chess-movelist__header">
        <span className="chess-movelist__title">Moves</span>
        <span className="chess-movelist__hint">SAN · chess.js</span>
      </div>
      <div ref={scrollRef} className="chess-movelist__scroll" role="list">
        {rows.map((row) => (
          <div key={row.num} className="chess-movelist__row" role="listitem">
            <span className="chess-movelist__num">{row.num}.</span>
            <span className="chess-movelist__white" title={row.white?.uci}>
              {row.white?.san ?? ''}
            </span>
            <span className="chess-movelist__black" title={row.black?.uci}>
              {row.black?.san ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
