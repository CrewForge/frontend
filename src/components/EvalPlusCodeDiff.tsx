import React from 'react';
import { diffLines, type DiffLine } from '../lib/lineDiff';

type EvalPlusCodeDiffProps = {
  before: string;
  after: string;
  className?: string;
};

function lineRowClass(d: DiffLine): string {
  if (d.kind === 'add') return 'evalplus-diff-line evalplus-diff-line--add';
  if (d.kind === 'remove') return 'evalplus-diff-line evalplus-diff-line--remove';
  return 'evalplus-diff-line evalplus-diff-line--same';
}

function gutterClass(d: DiffLine): string {
  const base = 'evalplus-diff-gutter';
  if (d.kind === 'add') return `${base} evalplus-diff-gutter--add`;
  if (d.kind === 'remove') return `${base} evalplus-diff-gutter--remove`;
  return `${base} text-muted-foreground`;
}

export function EvalPlusCodeDiff({
  before,
  after,
  className,
}: EvalPlusCodeDiffProps) {
  const lines = diffLines(before, after);
  const hasChanges = lines.some((d) => d.kind !== 'same');

  return (
    <div
      className={`overflow-x-auto rounded-lg border bg-card p-3 text-left font-mono text-[11px] leading-relaxed sm:text-xs ${className ?? ''}`}
    >
      {!hasChanges && <div className="pb-2 text-[10px] text-muted-foreground sm:text-[11px]">No line changes in this iteration.</div>}
      {lines.map((d, i) => (
        <div key={i} className={lineRowClass(d)}>
          <span className={gutterClass(d)}>{d.kind === 'add' ? '+' : d.kind === 'remove' ? '-' : ' '}</span>
          <span className="whitespace-pre-wrap break-all">{d.text || ' '}</span>
        </div>
      ))}
    </div>
  );
}
