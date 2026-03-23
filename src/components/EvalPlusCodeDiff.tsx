import React, { useMemo } from 'react';
import { diffLines, type DiffLine } from '../lib/lineDiff';
import { detectLanguage, highlightLine } from '../lib/syntaxHighlight';

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
  return `${base} evalplus-diff-gutter--same`;
}

export function EvalPlusCodeDiff({ before, after, className }: EvalPlusCodeDiffProps) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const detectedLanguage = useMemo(() => detectLanguage(before, after), [before, after]);
  const lineHtml = useMemo(
    () => lines.map((d) => highlightLine(d.text || ' ', detectedLanguage)),
    [lines, detectedLanguage],
  );
  const hasChanges = lines.some((d) => d.kind !== 'same');
  const showLang = (before || after).trim().length > 0;

  return (
    <div className={`evalplus-ide-panel evalplus-ide-diff overflow-x-auto text-left text-[11px] leading-relaxed sm:text-xs ${className ?? ''}`}>
      <div className="evalplus-ide-chrome">
        <span className="evalplus-ide-chrome-label">Diff</span>
        {showLang && <span className="evalplus-ide-lang-pill">{detectedLanguage}</span>}
      </div>
      <div className="evalplus-ide-body">
        {!hasChanges && <div className="evalplus-ide-empty">No line changes in this iteration.</div>}
        {lines.map((d, i) => (
          <div key={i} className={lineRowClass(d)}>
            <span className={gutterClass(d)}>{d.kind === 'add' ? '+' : d.kind === 'remove' ? '−' : '\u00a0'}</span>
            <span
              className="evalplus-diff-line-code"
              dangerouslySetInnerHTML={{ __html: lineHtml[i] ?? '' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
