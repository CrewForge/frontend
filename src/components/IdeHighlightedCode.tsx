import React, { useMemo } from 'react';
import { highlightFullCode } from '../lib/syntaxHighlight';
import { CopyCodeButton } from './CopyCodeButton';

type IdeHighlightedCodeProps = {
  code: string;
  /** Tab label in chrome bar */
  fileTab?: string;
  /** When true, panel sits flush inside a Card (no outer frame) */
  embedded?: boolean;
  emptyLabel?: string;
};

export function IdeHighlightedCode({
  code,
  fileTab = 'solution.py',
  embedded = false,
  emptyLabel = '—',
}: IdeHighlightedCodeProps) {
  const { html, language } = useMemo(() => highlightFullCode(code), [code]);
  const hasCode = code.trim().length > 0;

  const panelClass = embedded
    ? 'evalplus-ide-panel evalplus-ide-panel--embedded overflow-hidden'
    : 'evalplus-ide-panel overflow-hidden';

  return (
    <div className={panelClass}>
      <div className="evalplus-ide-chrome">
        <span className="evalplus-ide-chrome-label">{fileTab}</span>
        <div className="evalplus-ide-chrome-trail">
          {hasCode && <span className="evalplus-ide-lang-pill">{language}</span>}
          <CopyCodeButton textToCopy={code} disabled={!hasCode} />
        </div>
      </div>
      {hasCode ? (
        <pre className="evalplus-ide-readonly">
          <code className="hljs evalplus-hljs" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      ) : (
        <pre className="evalplus-ide-readonly evalplus-ide-readonly--empty">{emptyLabel}</pre>
      )}
    </div>
  );
}
