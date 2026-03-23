/**
 * Syntax highlighting via highlight.js — full language pack + autodetection.
 * Used by EvalPlus IDE panels (diff + full file view).
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
 * Autodetect language from the two versions of code (EvalPlus before/after).
 */
export function detectLanguage(before: string, after: string): string {
  const text = pickTextForDetection(before, after);
  if (!text.trim()) return 'plaintext';
  try {
    const result = hljs.highlightAuto(text);
    return result.language ?? 'plaintext';
  } catch {
    return 'plaintext';
  }
}

/**
 * Highlight an entire source file. Uses highlightAuto for language detection.
 */
export function highlightFullCode(code: string): { html: string; language: string } {
  if (!code.trim()) return { html: '', language: 'plaintext' };
  try {
    const auto = hljs.highlightAuto(code);
    const lang = auto.language ?? 'plaintext';
    return { html: auto.value, language: lang };
  } catch {
    return { html: escapeHtml(code), language: 'plaintext' };
  }
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
