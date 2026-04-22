import type { FileContent, FileNode, ProcessedFiles } from './types';
import { compareTreeNodes } from './shared';

const PLAIN_SEPARATOR = '='.repeat(16);
const PLAIN_LONG_SEPARATOR = '='.repeat(64);
const GENERATION_HEADER = 'This file is a merged representation of the current codebase, prepared by Structure Insight.';
const SUMMARY_PURPOSE = [
  "This file contains a packed representation of the entire repository's contents.",
  'It is designed to be easily consumable by AI systems for analysis, code review,',
  'or other automated processes.',
].join('\n');
const SUMMARY_FILE_FORMAT = [
  'The content is organized as follows:',
  '1. This summary section',
  '2. Repository information',
  '3. Directory structure',
  '4. Repository files (if enabled)',
  '5. Multiple file entries, each consisting of:',
  '  a. A separator line (================)',
  '  b. The file path (File: path/to/file)',
  '  c. Another separator line',
  '  d. The full contents of the file',
  '  e. A blank line',
].join('\n');
const BASE_SUMMARY_USAGE_GUIDELINES = [
  '- This file should be treated as read-only. Any changes should be made to the',
  '  original repository files, not this packed version.',
  '- When processing this file, use the file path to distinguish',
  '  between different files in the repository.',
  '- Be aware that this file may contain sensitive information. Handle it with',
  '  the same level of security as you would the original repository.',
];
const BASE_SUMMARY_NOTES = [
  "- Some files may have been excluded based on detected ignore files and Structure Insight's export settings",
  '- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files',
];

interface RepomixPlainOutputOptions {
  includeFileSummary: boolean;
  includeDirectoryStructure: boolean;
  includeFiles: boolean;
  userProvidedHeader?: string;
  instruction?: string;
}

function getFileContentSuffix(content: string): string[] {
  return content.endsWith('\n') ? [] : [''];
}

function getFilesSectionTrailingBlankLines(activeFiles: FileContent[], hasFollowingSection: boolean): string[] {
  if (activeFiles.length === 0) {
    return [];
  }

  const lastFile = activeFiles[activeFiles.length - 1];
  const extraBlankLineCount = lastFile.content.endsWith('\n')
    ? hasFollowingSection
      ? 4
      : 3
    : hasFollowingSection
      ? 3
      : 2;

  return Array.from({ length: extraBlankLineCount }, () => '');
}

function getActiveFiles(fileContents: FileContent[]): FileContent[] {
  return fileContents.filter((file) => !file.excluded);
}

function buildSummaryNotes(processedData: ProcessedFiles): string {
  const metadata = processedData.exportMetadata ?? {
    usesDefaultIgnorePatterns: true,
    usesGitignorePatterns: false,
    sortsByGitChangeCount: false,
  };
  const notes = [...BASE_SUMMARY_NOTES];

  if (metadata.usesGitignorePatterns) {
    notes.push('- Files matching patterns in .gitignore, .ignore, or .repomixignore are excluded');
  }

  if (metadata.usesDefaultIgnorePatterns) {
    notes.push('- Files matching default ignore patterns are excluded');
  }

  if (metadata.sortsByGitChangeCount) {
    notes.push('- Files are sorted by Git change count (files with more changes are at the bottom)');
  }

  return notes.join('\n');
}

function buildSummaryUsageGuidelines(options: RepomixPlainOutputOptions): string {
  const lines = [...BASE_SUMMARY_USAGE_GUIDELINES];

  if (options.userProvidedHeader?.trim()) {
    lines.push(
      '- Pay special attention to the Repository Description. These contain important context and guidelines specific to this project.',
    );
  }

  if (options.instruction?.trim()) {
    lines.push(
      '- Pay special attention to the Repository Instruction. These contain important context and guidelines specific to this project.',
    );
  }

  return lines.join('\n');
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort(compareTreeNodes);
}

function buildDirectoryLines(nodes: FileNode[], indent = ''): string[] {
  const lines: string[] = [];

  for (const node of sortNodes(nodes)) {
    lines.push(`${indent}${node.name}${node.isDirectory ? '/' : ''}`);

    if (node.isDirectory && node.children.length > 0) {
      lines.push(...buildDirectoryLines(node.children, `${indent}  `));
    }
  }

  return lines;
}

function buildRepomixDirectoryStructure(processedData: ProcessedFiles): string {
  if (
    ['Project', '项目'].includes(processedData.rootName) &&
    processedData.treeData.length > 1 &&
    processedData.treeData.every((node) => node.isDirectory)
  ) {
    return sortNodes(processedData.treeData)
      .map((node) => `[${node.name}]/\n${buildDirectoryLines(node.children, '  ').join('\n')}`)
      .join('\n\n');
  }

  const rootNode =
    processedData.treeData.length === 1 &&
    processedData.treeData[0].isDirectory &&
    processedData.treeData[0].name === processedData.rootName
      ? processedData.treeData[0]
      : null;

  const nodesToRender = rootNode ? rootNode.children : processedData.treeData;
  return buildDirectoryLines(nodesToRender).join('\n');
}

function getSecurityFindings(processedData: ProcessedFiles, activeFiles: FileContent[]) {
  return processedData.securityFindings ?? activeFiles.flatMap((file) => file.securityFindings ?? []);
}

export function generateRepomixPlainOutput(
  processedData: ProcessedFiles,
  options: RepomixPlainOutputOptions,
): string {
  const activeFiles = getActiveFiles(processedData.fileContents);
  const securityFindings = getSecurityFindings(processedData, activeFiles);
  const hasSectionAfterFiles = securityFindings.length > 0 || Boolean(options.instruction?.trim());
  const lines: string[] = [];

  if (options.includeFileSummary) {
    lines.push(
      GENERATION_HEADER,
      '',
      PLAIN_LONG_SEPARATOR,
      'File Summary',
      PLAIN_LONG_SEPARATOR,
      '',
      'Purpose:',
      '--------',
      SUMMARY_PURPOSE,
      '',
      'File Format:',
      '------------',
      SUMMARY_FILE_FORMAT,
      '',
      'Usage Guidelines:',
      '-----------------',
      buildSummaryUsageGuidelines(options),
      '',
      'Notes:',
      '------',
      buildSummaryNotes(processedData),
      '',
    );

    if (options.userProvidedHeader?.trim()) {
      lines.push('');
    }
  }

  if (options.userProvidedHeader?.trim()) {
    lines.push(
      PLAIN_LONG_SEPARATOR,
      'User Provided Header',
      PLAIN_LONG_SEPARATOR,
      options.userProvidedHeader.trim(),
      '',
    );
  }

  if (options.includeDirectoryStructure) {
    const directoryStructure = buildRepomixDirectoryStructure(processedData);

    lines.push(
      PLAIN_LONG_SEPARATOR,
      'Directory Structure',
      PLAIN_LONG_SEPARATOR,
      directoryStructure,
      '',
    );
  }

  if (options.includeFiles) {
    lines.push(
      PLAIN_LONG_SEPARATOR,
      'Files',
      PLAIN_LONG_SEPARATOR,
      '',
    );

    for (const file of activeFiles) {
      lines.push(
        PLAIN_SEPARATOR,
        `File: ${file.path}`,
        PLAIN_SEPARATOR,
        file.content,
        ...getFileContentSuffix(file.content),
      );
    }

    lines.push(...getFilesSectionTrailingBlankLines(activeFiles, hasSectionAfterFiles));
  }

  if (securityFindings.length > 0) {
    lines.push(
      PLAIN_LONG_SEPARATOR,
      'Security Warnings',
      PLAIN_LONG_SEPARATOR,
      ...securityFindings.map((finding) => `- [${finding.severity}] ${finding.filePath}: ${finding.message}`),
      '',
    );
  }

  if (options.instruction?.trim()) {
    lines.push(
      PLAIN_LONG_SEPARATOR,
      'Instruction',
      PLAIN_LONG_SEPARATOR,
      options.instruction.trim(),
      '',
    );
  }

  lines.push(
    PLAIN_LONG_SEPARATOR,
    'End of Codebase',
    PLAIN_LONG_SEPARATOR,
    '',
  );

  return lines.join('\n');
}
