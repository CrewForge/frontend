import hljs from 'highlight.js';

/**
 * Map GitHub-style fence identifiers to highlight.js grammar names.
 * Returns null if the token is empty or not registered in highlight.js.
 */
export function mapFenceLanguageToHljs(token: string): string | null {
  const raw = token.trim();
  if (!raw) return null;
  const t = raw.toLowerCase();

  const aliases: Record<string, string> = {
    py: 'python',
    python2: 'python',
    python3: 'python',
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'tsx',
    jsx: 'jsx',
    rb: 'ruby',
    rs: 'rust',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    bash: 'bash',
    yml: 'yaml',
    'c++': 'cpp',
    cxx: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    hxx: 'cpp',
    cs: 'csharp',
    fs: 'fsharp',
    kt: 'kotlin',
    kts: 'kotlin',
    md: 'markdown',
    text: 'plaintext',
    txt: 'plaintext',
  };

  const mapped = aliases[t] ?? t;
  if (hljs.getLanguage(mapped)) return mapped;
  if (hljs.getLanguage(t)) return t;
  return null;
}

/**
 * If the payload starts with a markdown fenced block (```lang), strip the opening
 * fence line and an optional closing ``` at the end. Returns the inner code and
 * the declared language when it maps to a highlight.js grammar.
 */
export function stripMarkdownCodeFence(raw: string): { code: string; language: string | null } {
  const rawNorm = raw.replace(/^\uFEFF/, '');
  const openMatch = /^\s*```\s*([\w#.+-]*)\s*\r?\n/.exec(rawNorm);
  if (!openMatch) {
    return { code: raw, language: null };
  }

  const langToken = (openMatch[1] ?? '').trim();
  let body = rawNorm.slice(openMatch[0].length);

  // Remove closing fence only when it appears at the end (``` on its own line or trailing).
  body = body.replace(/\r?\n```\s*$/, '');
  if (body.endsWith('```')) {
    body = body.replace(/```\s*$/, '');
  }

  const language = mapFenceLanguageToHljs(langToken);
  return { code: body.trimEnd(), language };
}
