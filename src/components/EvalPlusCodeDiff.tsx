import React, { useMemo } from 'react';
import { EVALPLUS_CODE_AREA_CLASS } from '../lib/evalplusWorkspace';
import { diffLines, type DiffLine } from '../lib/lineDiff';
import { detectLanguage, highlightLine } from '../lib/syntaxHighlight';

type EvalPlusCodeDiffProps = {
  before: string;
  after: string;
  /** Registered highlight.js language (e.g. from ```lang); overrides autodetection when set. */
  highlightLanguage?: string | null;
  className?: string;
  /** When true, render only the diff body (no outer panel, chrome, or copy). For use inside EvalPlusCodeWorkspace. */
  contentOnly?: boolean;
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

export function EvalPlusCodeDiff({
  before,
  after,
  highlightLanguage,
  className,
  contentOnly = false,
}: EvalPlusCodeDiffProps) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const detectedLanguage = useMemo(
    () => highlightLanguage ?? detectLanguage(before, after),
    [before, after, highlightLanguage],
  );
  const lineHtml = useMemo(
    () => lines.map((d) => highlightLine(d.text || ' ', detectedLanguage)),
    [lines, detectedLanguage],
  );
  const hasChanges = lines.some((d) => d.kind !== 'same');
  const showLang = (before || after).trim().length > 0;

  const body = (
    <div className={`evalplus-ide-body ${contentOnly ? 'evalplus-ide-body--merged' : ''}`}>
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
  );

  if (contentOnly) {
    return (
      <div className={`evalplus-ide-diff ${EVALPLUS_CODE_AREA_CLASS} text-left ${className ?? ''}`}>{body}</div>
    );
  }

  return (
    <div className={`evalplus-ide-panel evalplus-ide-diff ${EVALPLUS_CODE_AREA_CLASS} text-left ${className ?? ''}`}>
      <div className="evalplus-ide-chrome">
        <span className="evalplus-ide-chrome-label">Diff</span>
        <div className="evalplus-ide-chrome-trail">
          {showLang && <span className="evalplus-ide-lang-pill">{detectedLanguage}</span>}
        </div>
      </div>
      {body}
    </div>
  );
}
