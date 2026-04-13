import type { HLJSApi, LanguageFn } from 'highlight.js';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

export const HIGHLIGHT_LANGUAGES: Record<string, LanguageFn> = {
  bash,
  css,
  diff,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
};

export const HIGHLIGHT_ALIASES: Record<string, string[]> = {
  bash: ['sh', 'shell', 'zsh'],
  javascript: ['js', 'jsx', 'node', 'nodejs'],
  markdown: ['md'],
  python: ['py', 'py3'],
  typescript: ['ts', 'tsx'],
  xml: ['html', 'htm', 'svg'],
  yaml: ['yml'],
};

export const HIGHLIGHT_PLAINTEXT = ['text', 'txt', 'plaintext'];

let isRegistered = false;

export const registerHighlightLanguages = (hljs: HLJSApi) => {
  if (isRegistered) return;

  Object.entries(HIGHLIGHT_LANGUAGES).forEach(([name, language]) => {
    hljs.registerLanguage(name, language);
  });

  Object.entries(HIGHLIGHT_ALIASES).forEach(([languageName, aliases]) => {
    hljs.registerAliases(aliases, { languageName });
  });

  isRegistered = true;
};
