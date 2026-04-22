import JSZip from 'jszip';

import { fileToString } from '../fileHelpers';
import { generateRepomixPlainOutput } from './repomixPlainOutput';
import {
  compareFilePaths,
  countLines,
  estimateTokens,
  IGNORED_DIRS,
  IGNORED_EXTENSIONS,
  LANG_MAP,
  sortTreeNodes,
} from './shared';
import type {
  AnalysisSummary,
  FileContent,
  FileNode,
  ProcessedFiles,
  SecurityFinding,
  SecurityFindingSeverity,
} from './types';

const IGNORE_FILE_NAMES = new Set(['.gitignore', '.ignore', '.repomixignore']);

interface SecurityRule {
  ruleId: string;
  severity: SecurityFindingSeverity;
  message: string;
  pattern: RegExp;
}

interface IgnoreTestResult {
  ignored: boolean;
  unignored: boolean;
}

interface IgnoreMatcherInstance {
  test(path: string): IgnoreTestResult;
}

interface IgnoreMatcher {
  basePath: string;
  matcher: IgnoreMatcherInstance;
}

export interface ImportContextBuildOptions {
  includeEmptyDirectories?: boolean;
  emptyDirectoryPaths?: string[];
}

export interface PathFileInput {
  file: File;
  path: string;
}

interface ReadTextFileResult {
  content: string;
  lineCount: number;
}

interface ZipExtractionResult {
  files: File[];
  emptyDirectoryPaths: string[];
}

const SECURITY_RULES: SecurityRule[] = [
  {
    ruleId: 'openai-api-key',
    severity: 'high',
    message: 'Potential OpenAI API key detected.',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    ruleId: 'private-key',
    severity: 'high',
    message: 'Potential private key block detected.',
    pattern: /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/g,
  },
  {
    ruleId: 'aws-access-key',
    severity: 'high',
    message: 'Potential AWS access key detected.',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    ruleId: 'inline-secret',
    severity: 'medium',
    message: 'Potential inline secret assignment detected.',
    pattern: /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*['"][^'"\n]{8,}['"]/gi,
  },
];

function getLanguage(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[extension] || 'plaintext';
}

function getFilePath(file: File): string {
  return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}

function shouldExpandZipFile(file: File): boolean {
  const relativePath = file.webkitRelativePath;
  return !relativePath || relativePath === file.name;
}

function buildASCIITree(treeData: FileNode[], rootName: string): string {
  let structure = `${rootName}\n`;

  const generateLines = (nodes: FileNode[], prefix: string) => {
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      structure += `${prefix}${connector}${node.name}\n`;

      if (node.isDirectory && node.children.length > 0) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        generateLines(node.children, nextPrefix);
      }
    });
  };

  generateLines(treeData, '');
  return structure;
}

function buildPreview(match: string): string {
  return match.length > 80 ? `${match.slice(0, 77)}...` : match;
}

function getLineAndColumn(content: string, index: number): { line: number; column: number } {
  const beforeMatch = content.slice(0, index);
  const line = beforeMatch.split('\n').length;
  const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
  const column = index - lastNewlineIndex;

  return { line, column };
}

function scanSensitiveContent(filePath: string, content: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const rule of SECURITY_RULES) {
    const regex = new RegExp(rule.pattern);
    let match: RegExpExecArray | null = regex.exec(content);

    while (match) {
      const { line, column } = getLineAndColumn(content, match.index ?? 0);
      findings.push({
        filePath,
        ruleId: rule.ruleId,
        severity: rule.severity,
        message: rule.message,
        preview: buildPreview(match[0]),
        line,
        column,
      });

      if (findings.length >= 20) {
        return findings;
      }

      match = regex.exec(content);
    }
  }

  return findings;
}

function summarizeAnalysis(fileContents: FileContent[]): {
  analysisSummary: AnalysisSummary;
  securityFindings: SecurityFinding[];
} {
  const activeFiles = fileContents.filter((file) => !file.excluded);
  const securityFindings = activeFiles.flatMap((file) => file.securityFindings ?? []);

  return {
    analysisSummary: {
      totalEstimatedTokens: activeFiles.reduce((sum, file) => sum + file.stats.estimatedTokens, 0),
      securityFindingCount: securityFindings.length,
      scannedFileCount: activeFiles.length,
    },
    securityFindings,
  };
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function createBasenameMatcher(pattern: string): (path: string) => boolean {
  return (path: string) => {
    const normalizedPath = normalizePath(path);
    return normalizedPath.split('/').some((segment) => segment === pattern);
  };
}

function createDirectoryMatcher(pattern: string): (path: string) => boolean {
  return (path: string) => {
    const normalizedPath = normalizePath(path);
    return normalizedPath === pattern || normalizedPath.startsWith(`${pattern}/`);
  };
}

function createPathMatcher(pattern: string): (path: string) => boolean {
  return (path: string) => normalizePath(path) === pattern;
}

function createIgnoreMatcher(patterns: string[]): IgnoreMatcherInstance {
  const rules = patterns.map((pattern) => {
    const isNegated = pattern.startsWith('!');
    const rawPattern = normalizePath(isNegated ? pattern.slice(1) : pattern);
    const isDirectory = pattern.endsWith('/');
    const hasSlash = rawPattern.includes('/');

    return {
      isNegated,
      matches: isDirectory
        ? createDirectoryMatcher(rawPattern)
        : hasSlash
          ? createPathMatcher(rawPattern)
          : createBasenameMatcher(rawPattern),
    };
  });

  return {
    test(path: string) {
      let ignored = false;
      let unignored = false;

      for (const rule of rules) {
        if (!rule.matches(path)) {
          continue;
        }

        if (rule.isNegated) {
          ignored = false;
          unignored = true;
        } else {
          ignored = true;
          unignored = false;
        }
      }

      return { ignored, unignored };
    },
  };
}

function parseGitignorePatterns(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

async function readTextFileWithMetrics(file: File): Promise<ReadTextFileResult> {
  const content = await fileToString(file);
  return {
    content,
    lineCount: countLines(content),
  };
}

async function buildRootGitignoreMatchers(files: File[]): Promise<IgnoreMatcher[]> {
  const matchers: IgnoreMatcher[] = [];

  for (const file of files) {
    const path = getFilePath(file);
    const parts = path.split('/').filter(Boolean);
    const fileName = parts[parts.length - 1];

    if (!fileName || !IGNORE_FILE_NAMES.has(fileName)) {
      continue;
    }

    const patterns = parseGitignorePatterns(await fileToString(file));
    if (patterns.length === 0) {
      continue;
    }

    matchers.push({
      basePath: parts.slice(0, -1).join('/'),
      matcher: createIgnoreMatcher(patterns),
    });
  }

  matchers.sort(
    (a, b) => a.basePath.split('/').filter(Boolean).length - b.basePath.split('/').filter(Boolean).length,
  );
  return matchers;
}

function isPathWithinBase(basePath: string, path: string): boolean {
  if (!basePath) {
    return true;
  }

  return path === basePath || path.startsWith(`${basePath}/`);
}

function relativeToBase(path: string, basePath: string, isDirectory: boolean): string {
  const relative = basePath ? path.slice(basePath.length + 1) : path;
  if (!relative) {
    return relative;
  }

  return isDirectory && !relative.endsWith('/') ? `${relative}/` : relative;
}

function isIgnoredByGitignore(path: string, matchers: IgnoreMatcher[], isDirectory = false): boolean {
  if (path.split('/').filter(Boolean).length < 2) {
    return false;
  }

  let ignored = false;

  for (const matcher of matchers) {
    if (!isPathWithinBase(matcher.basePath, path)) {
      continue;
    }

    const relativePath = relativeToBase(path, matcher.basePath, isDirectory);
    if (!relativePath) {
      continue;
    }

    const result = matcher.matcher.test(relativePath);
    if (result.ignored) {
      ignored = true;
    }
    if (result.unignored) {
      ignored = false;
    }
  }

  return ignored;
}

function ensureDirectoryPath(path: string, nodeMap: Map<string, FileNode>, roots: FileNode[]): void {
  const parts = path.split('/').filter(Boolean);
  let parentNode: FileNode | undefined;

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const currentPath = parts.slice(0, index + 1).join('/');

    if (nodeMap.has(currentPath)) {
      parentNode = nodeMap.get(currentPath);
      continue;
    }

    const newNode: FileNode = {
      name: part,
      path: currentPath,
      isDirectory: true,
      children: [],
    };
    nodeMap.set(currentPath, newNode);

    if (parentNode) {
      parentNode.children.push(newNode);
    } else {
      roots.push(newNode);
    }

    parentNode = newNode;
  }
}

async function filterDirectoryPaths(directoryPaths: string[], rootGitignoreMatchers: IgnoreMatcher[]): Promise<string[]> {
  const results = await Promise.all(
    directoryPaths.map(async (path) => {
      const defaultIgnored = path.split('/').some((part) => IGNORED_DIRS.has(part));
      const gitignored = isIgnoredByGitignore(path, rootGitignoreMatchers, true);
      const includeMismatch = false;
      const ignoreMatched = false;

      return !defaultIgnored && !gitignored && !includeMismatch && !ignoreMatched ? path : null;
    }),
  );

  return results.filter((path): path is string => path !== null);
}

async function processZipFile(zipFile: File): Promise<ZipExtractionResult> {
  const zip = await JSZip.loadAsync(zipFile);
  const files: File[] = [];
  const zipRoot = zipFile.name.replace(/\.zip$/i, '');
  const directoryCandidates = new Set<string>();

  const promises = Object.values(zip.files).map(async (entry) => {
    if (entry.dir) {
      const normalized = entry.name.replace(/\/$/, '');
      if (normalized) {
        directoryCandidates.add(`${zipRoot}/${normalized}`);
      }
      return;
    }

    const blob = await entry.async('blob');
    const file = new File([blob], entry.name, {
      type: blob.type,
      lastModified: entry.date.getTime(),
    });

    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: `${zipRoot}/${entry.name}`,
      writable: true,
    });
    files.push(file);
  });

  await Promise.all(promises);

  const filePathSet = new Set(files.map((file) => getFilePath(file)));
  const emptyDirectoryPaths = [...directoryCandidates].filter((dirPath) => {
    const prefix = `${dirPath}/`;
    return ![...filePathSet].some((filePath) => filePath.startsWith(prefix));
  });

  return { files, emptyDirectoryPaths };
}

async function processImportFiles(
  files: File[],
  options: Required<ImportContextBuildOptions>,
): Promise<ProcessedFiles> {
  const fileContents: FileContent[] = [];
  const nodeMap = new Map<string, FileNode>();
  const roots: FileNode[] = [];
  const allNonZipFiles: File[] = [];
  const zipEmptyDirectoryPaths: string[] = [];

  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip') && shouldExpandZipFile(file)) {
      const unzipped = await processZipFile(file);
      allNonZipFiles.push(...unzipped.files);
      zipEmptyDirectoryPaths.push(...unzipped.emptyDirectoryPaths);
    } else {
      allNonZipFiles.push(file);
    }
  }

  const rootGitignoreMatchers = await buildRootGitignoreMatchers(allNonZipFiles);

  const validFilesWithDecision = await Promise.all(
    allNonZipFiles.map(async (file) => {
      const path = getFilePath(file);
      const defaultIgnored = path.split('/').some((part) => IGNORED_DIRS.has(part));
      const gitignored = isIgnoredByGitignore(path, rootGitignoreMatchers);
      const includeMismatch = false;
      const ignoreMatched = false;

      return path && !defaultIgnored && !gitignored && !includeMismatch && !ignoreMatched ? file : null;
    }),
  );

  const validFiles = validFilesWithDecision.filter((file): file is File => file !== null);

  for (const file of validFiles) {
    const path = getFilePath(file);
    const parts = path.split('/').filter(Boolean);
    let parentNode: FileNode | undefined;

    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      const currentPath = parts.slice(0, index + 1).join('/');

      if (nodeMap.has(currentPath)) {
        parentNode = nodeMap.get(currentPath);
        continue;
      }

      const isDirectory = index < parts.length - 1;
      const newNode: FileNode = {
        name: part,
        path: currentPath,
        isDirectory,
        children: [],
      };
      nodeMap.set(currentPath, newNode);

      if (parentNode) {
        parentNode.children.push(newNode);
      } else {
        roots.push(newNode);
      }

      parentNode = newNode;
    }

    const fileNode = nodeMap.get(path);
    if (!fileNode) {
      continue;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (IGNORED_EXTENSIONS.has(extension)) {
      fileNode.status = 'skipped';
      fileNode.chars = file.size;
      continue;
    }

    try {
      const { content, lineCount } = await readTextFileWithMetrics(file);
      fileContents.push({
        path,
        content,
        originalContent: content,
        language: getLanguage(file.name),
        stats: {
          lines: lineCount,
          chars: content.length,
          estimatedTokens: estimateTokens(content),
        },
        securityFindings: scanSensitiveContent(path, content),
      });
      fileNode.status = 'processed';
      fileNode.lines = lineCount;
      fileNode.chars = content.length;
    } catch {
      fileNode.status = 'error';
    }
  }

  fileContents.sort((a, b) => compareFilePaths(a.path, b.path));

  let rootNameForDisplay = 'Project';
  if (roots.length === 1 && roots[0].isDirectory) {
    rootNameForDisplay = roots[0].name;
  }

  const mergedEmptyDirectoryPaths = Array.from(
    new Set([...(options.emptyDirectoryPaths ?? []), ...zipEmptyDirectoryPaths]),
  );
  const filteredEmptyDirectoryPaths = options.includeEmptyDirectories
    ? await filterDirectoryPaths(mergedEmptyDirectoryPaths, rootGitignoreMatchers)
    : [];

  for (const emptyDirPath of filteredEmptyDirectoryPaths) {
    ensureDirectoryPath(emptyDirPath, nodeMap, roots);
  }

  sortTreeNodes(roots);

  const structureString = buildASCIITree(roots, rootNameForDisplay);
  const { analysisSummary, securityFindings } = summarizeAnalysis(fileContents);

  return {
    treeData: roots,
    fileContents,
    structureString,
    rootName: rootNameForDisplay,
    emptyDirectoryPaths: filteredEmptyDirectoryPaths,
    removedPaths: [],
    analysisSummary,
    securityFindings,
    exportMetadata: {
      usesDefaultIgnorePatterns: true,
      usesGitignorePatterns: rootGitignoreMatchers.length > 0,
      sortsByGitChangeCount: false,
    },
  };
}

function normalizeExportPaths(data: ProcessedFiles): ProcessedFiles {
  const stripRootPrefix = (path: string) => {
    const prefix = `${data.rootName}/`;
    return path.startsWith(prefix) ? path.slice(prefix.length) : path;
  };

  return {
    ...data,
    fileContents: data.fileContents.map((file) => ({
      ...file,
      path: stripRootPrefix(file.path),
    })),
    emptyDirectoryPaths: (data.emptyDirectoryPaths ?? []).map(stripRootPrefix),
  };
}

function toInputFileArray(inputs: File[] | FileList | PathFileInput[]): File[] {
  const items = Array.isArray(inputs) ? inputs : Array.from(inputs);

  return items.map((item) => {
    if ('file' in item && 'path' in item) {
      const { file, path } = item;
      Object.defineProperty(file, 'webkitRelativePath', {
        configurable: true,
        value: path,
      });
      return file;
    }

    return item as File;
  });
}

export async function buildImportContextFile(
  inputs: File[] | FileList | PathFileInput[],
  options: ImportContextBuildOptions = {},
): Promise<File> {
  const normalizedOptions: Required<ImportContextBuildOptions> = {
    includeEmptyDirectories: options.includeEmptyDirectories ?? false,
    emptyDirectoryPaths: options.emptyDirectoryPaths ?? [],
  };
  const files = toInputFileArray(inputs);
  const processed = await processImportFiles(files, normalizedOptions);
  const normalizedData = normalizeExportPaths(processed);
  const output = generateRepomixPlainOutput(normalizedData, {
    includeFileSummary: true,
    includeDirectoryStructure: true,
    includeFiles: true,
  });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new File([output], `${processed.rootName}-context-${timestamp}.txt`, { type: 'text/plain' });
}

export async function generateZipContext(
  zipFile: File,
  options: ImportContextBuildOptions = {},
): Promise<File> {
  return buildImportContextFile([zipFile], options);
}
