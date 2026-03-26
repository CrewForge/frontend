/**
 * Syntax highlighting via highlight.js — full language pack + autodetection.
 * Used by EvalPlus IDE panels (diff + full file view).
 *
 * highlight.js full autodetection often mislabels Python as `vim` or `csharp`.
 * We use (1) cheap structural heuristics for common eval languages, then
 * (2) highlightAuto restricted to a subset that drops the worst offenders.
 */
import hljs from 'highlight.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Prefer the longer snippet so detection is more reliable on small diffs */
function pickTextForDetection(before: string, after: string): string {
  const a = (after ?? '').trim();
  const b = (before ?? '').trim();
  if (a.length >= b.length) return after ?? before ?? '';
  return before ?? after ?? '';
}

/**
 * Grammars that rarely appear in HumanEval-style snippets but often steal
 * confidence from Python / similar-looking code during highlightAuto.
 */
const EXCLUDE_FROM_AUTODETECT = new Set([
  'vim',
  'awk',
  'dos',
  'routeros',
  'ldif',
  'dns',
  'accesslog',
  'apache',
  'nginx',
  'pf',
  'x86asm',
  'mipsasm',
  'avrasm',
  'armasm',
  'cos',
  'isbl',
  'mel',
]);

const AUTO_DETECT_SUBSET = hljs.listLanguages().filter((l) => !EXCLUDE_FROM_AUTODETECT.has(l));

/** Strong Python signals (def/class/import, colons, typical keywords). */
function inferLikelyPython(text: string): boolean {
  const t = text.slice(0, 80_000);
  if (!t.trim()) return false;

  if (/^\s*(?:from\s+[\w.]+\s+import|import\s+[\w.])/m.test(t)) return true;
  if (/if\s+__name__\s*==\s*['"]__main__['"]/.test(t)) return true;
  if (/^\s*def\s+\w+\s*\([^)]*\)\s*(?:->\s*[\w\[\],\s]+)?\s*:/m.test(t)) return true;
  if (/^\s*async\s+def\s+\w+\s*\([^)]*\)\s*:/m.test(t)) return true;
  if (/^\s*class\s+\w+(?:\([^)]*\))?\s*:/m.test(t)) return true;

  const lines = t.split(/\r?\n/).slice(0, 400);
  let hits = 0;
  for (const line of lines) {
    if (/^\s*def\s+\w+\s*\(/.test(line)) hits += 2;
    else if (/^\s*class\s+\w+/.test(line)) hits += 2;
    else if (/^\s*from\s+[\w.]+\s+import\s/.test(line)) hits += 2;
    else if (/^\s*import\s+[\w.]+\s*(?:#.*)?$/.test(line)) hits += 2;
    else if (/^\s*elif\s+.+:/.test(line)) hits += 1;
    else if (/^\s*except(?:\s+|$)/.test(line)) hits += 1;
    else if (/^\s*finally\s*:/.test(line)) hits += 1;
    else if (/^\s*try\s*:/.test(line)) hits += 1;
    else if (/^\s*with\s+.+\s*:/.test(line)) hits += 1;
    else if (/^\s*@\w+/.test(line)) hits += 1;
    else if (/\bself\.\w+/.test(line)) hits += 1;
  }
  if (hits >= 3) return true;

  if (/\b(?:None|True|False)\b/.test(t) && /\bdef\s+\w+/.test(t)) return true;

  return false;
}

/** Typical C# / .NET surface syntax — avoids mislabeling Python when `class` appears. */
function inferLikelyCSharp(text: string): boolean {
  const t = text.slice(0, 80_000);
  if (/^\s*namespace\s+[\w.]+/m.test(t)) return true;
  if (/^\s*using\s+[\w.]+\s*;/m.test(t)) return true;
  if (/public\s+static\s+void\s+Main\s*\(/.test(t)) return true;
  if (/^\s*\[.*\]\s*$/m.test(t) && /\bclass\s+\w+/.test(t) && /\bnamespace\b/.test(t)) return true;
  return false;
}

function inferLanguageFromHeuristics(text: string): string | null {
  if (inferLikelyPython(text)) return 'python';
  if (inferLikelyCSharp(text)) return 'csharp';
  return null;
}

/**
 * Autodetect language from the two versions of code (EvalPlus before/after).
 */
export function detectLanguage(before: string, after: string): string {
  const text = pickTextForDetection(before, after);
  if (!text.trim()) return 'plaintext';
  const hinted = inferLanguageFromHeuristics(text);
  if (hinted) return hinted;
  try {
    const result = hljs.highlightAuto(text, AUTO_DETECT_SUBSET);
    return result.language ?? 'plaintext';
  } catch {
    return 'plaintext';
  }
}

/**
 * Highlight an entire source file. Uses heuristics + restricted highlightAuto.
 * When `languageOverride` is a registered highlight.js grammar, it wins (e.g. EvalPlus ```lang fences).
 */
export function highlightFullCode(code: string, languageOverride?: string | null): { html: string; language: string } {
  if (!code.trim()) return { html: '', language: 'plaintext' };
  if (languageOverride && hljs.getLanguage(languageOverride)) {
    try {
      const h = hljs.highlight(code, { language: languageOverride, ignoreIllegals: true });
      return { html: h.value, language: languageOverride };
    } catch {
      /* fall through */
    }
  }
  const hinted = inferLanguageFromHeuristics(code);
  if (hinted && hljs.getLanguage(hinted)) {
    try {
      const h = hljs.highlight(code, { language: hinted, ignoreIllegals: true });
      return { html: h.value, language: hinted };
    } catch {
      /* fall through */
    }
  }
  try {
    const auto = hljs.highlightAuto(code, AUTO_DETECT_SUBSET);
    const lang = auto.language ?? 'plaintext';
    return { html: auto.value, language: lang };
  } catch {
    return { html: escapeHtml(code), language: 'plaintext' };
  }
}

/**
 * EvalPlus: prefer an explicit fence language when valid; otherwise autodetect on stripped snippets.
 */
export function resolveEvalPlusHighlightLanguage(
  strippedBefore: string,
  strippedAfter: string,
  fenceLanguage: string | null,
): string {
  if (fenceLanguage && hljs.getLanguage(fenceLanguage)) return fenceLanguage;
  return detectLanguage(strippedBefore, strippedAfter);
}

/**
 * Highlight a single line for unified diff rows (same detected language for the step).
 */
export function highlightLine(line: string, language: string): string {
  const lang = hljs.getLanguage(language) ? language : 'plaintext';
  const payload = line.length === 0 ? ' ' : line;
  try {
    return hljs.highlight(payload, { language: lang, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(payload);
  }
}
