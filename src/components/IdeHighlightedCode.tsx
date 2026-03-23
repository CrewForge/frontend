import React, { useMemo } from 'react';
import { highlightFullCode } from '../lib/syntaxHighlight';
import { CopyCodeButton } from './CopyCodeButton';

type IdeHighlightedCodeProps = {
  code: string;
  /** Tab label in chrome bar */
  fileTab?: string;
  emptyLabel?: string;
  /** When true, render only the highlighted code block (no panel chrome or copy). For use inside EvalPlus merged workspace. */
  contentOnly?: boolean;
};

export function IdeHighlightedCode({
  code,
  fileTab = 'solution.py',
  emptyLabel = '—',
  contentOnly = false,
}: IdeHighlightedCodeProps) {
  const { html, language } = useMemo(() => highlightFullCode(code), [code]);
  const hasCode = code.trim().length > 0;

  const inner = hasCode ? (
    <pre className={`evalplus-ide-readonly ${contentOnly ? 'evalplus-ide-readonly--merged' : ''}`}>
      <code className="hljs evalplus-hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  ) : (
    <pre className={`evalplus-ide-readonly evalplus-ide-readonly--empty ${contentOnly ? 'evalplus-ide-readonly--merged' : ''}`}>
      {emptyLabel}
    </pre>
  );

  if (contentOnly) {
    return (
      <div className="evalplus-ide-solution-only evalplus-code-area overflow-hidden">{inner}</div>
    );
  }

  return (
    <div className="evalplus-ide-panel overflow-hidden">
      <div className="evalplus-ide-chrome">
        <span className="evalplus-ide-chrome-label">{fileTab}</span>
        <div className="evalplus-ide-chrome-trail">
          {hasCode && <span className="evalplus-ide-lang-pill">{language}</span>}
          <CopyCodeButton textToCopy={code} disabled={!hasCode} />
        </div>
      </div>
      {inner}
    </div>
  );
}
