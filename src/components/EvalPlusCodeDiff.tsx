import React from 'react';
import { diffLines, type DiffLine } from '../lib/lineDiff';

type EvalPlusCodeDiffProps = {
  before: string;
  after: string;
  className?: string;
};

function lineClass(d: DiffLine): string {
  if (d.kind === 'add') return 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100';
  if (d.kind === 'remove') return 'bg-rose-500/15 text-rose-900 dark:text-rose-100';
  return 'bg-muted/40 text-foreground';
}

export function EvalPlusCodeDiff({ before, after, className }: EvalPlusCodeDiffProps) {
  const lines = diffLines(before, after);
  return (
    <pre
      className={`overflow-x-auto rounded-lg border bg-card p-3 text-left font-mono text-[11px] leading-relaxed sm:text-xs ${className ?? ''}`}
    >
      {lines.map((d, i) => (
        <div key={i} className={`flex min-h-[1.25rem] border-l-2 pl-2 ${lineClass(d)}`}>
          <span className="w-6 shrink-0 select-none text-[10px] text-muted-foreground">
            {d.kind === 'add' ? '+' : d.kind === 'remove' ? '−' : ' '}
          </span>
          <span className="whitespace-pre-wrap break-all">{d.text || ' '}</span>
        </div>
      ))}
    </pre>
  );
}
