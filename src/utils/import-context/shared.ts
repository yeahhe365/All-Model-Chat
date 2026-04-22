import type { FileNode } from './types';

export const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.svg',
  '.ico',
  '.webp',
  '.mp3',
  '.wav',
  '.ogg',
  '.mp4',
  '.mov',
  '.avi',
  '.webm',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.exe',
  '.dll',
  '.so',
  '.o',
  '.a',
  '.obj',
  '.class',
  '.jar',
  '.pyc',
  '.pyd',
  '.ds_store',
  '.eot',
  '.ttf',
  '.woff',
  '.woff2',
]);

export const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '__pycache__',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'out',
  'target',
]);

export const LANG_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  html: 'xml',
  xml: 'xml',
  css: 'css',
  scss: 'css',
  less: 'css',
  json: 'json',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  php: 'php',
  rb: 'ruby',
  rs: 'rust',
  sql: 'sql',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  dockerfile: 'dockerfile',
  gradle: 'groovy',
  vue: 'html',
  svelte: 'html',
  log: 'plaintext',
  txt: 'plaintext',
  env: 'properties',
  ini: 'ini',
};

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const stableCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'variant',
});

function compareNaturalText(a: string, b: string): number {
  return naturalCollator.compare(a, b) || stableCollator.compare(a, b);
}

export function compareFilePaths(a: string, b: string): number {
  return compareNaturalText(a, b);
}

export function compareTreeNodes(a: FileNode, b: FileNode): number {
  if (a.isDirectory !== b.isDirectory) {
    return a.isDirectory ? -1 : 1;
  }

  return compareNaturalText(a.name, b.name) || compareNaturalText(a.path, b.path);
}

export function sortTreeNodes(nodes: FileNode[]): FileNode[] {
  nodes.sort(compareTreeNodes);

  for (const node of nodes) {
    if (node.isDirectory) {
      sortTreeNodes(node.children);
    }
  }

  return nodes;
}

export function countLines(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  let lines = 1;
  for (let index = 0; index < content.length; index++) {
    if (content.charCodeAt(index) === 10) {
      lines++;
    }
  }

  return lines;
}

const CJK_CHARACTER = /[\u3400-\u9FFF]/g;

export function estimateTokens(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  const cjkCount = content.match(CJK_CHARACTER)?.length ?? 0;
  const nonCjkCount = content.length - cjkCount;

  return cjkCount + Math.ceil(nonCjkCount / 4);
}
