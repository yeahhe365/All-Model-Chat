export type SecurityFindingSeverity = 'high' | 'medium';

export interface SecurityFinding {
  filePath: string;
  ruleId: string;
  severity: SecurityFindingSeverity;
  message: string;
  preview: string;
  line: number;
  column: number;
}

export interface FileStats {
  lines: number;
  chars: number;
  estimatedTokens: number;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileNode[];
  status?: 'processed' | 'skipped' | 'error';
  lines?: number;
  chars?: number;
  excluded?: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  originalContent?: string;
  language: string;
  stats: FileStats;
  securityFindings?: SecurityFinding[];
  excluded?: boolean;
}

export interface AnalysisSummary {
  totalEstimatedTokens: number;
  securityFindingCount: number;
  scannedFileCount: number;
}

export interface ProcessedFiles {
  treeData: FileNode[];
  fileContents: FileContent[];
  structureString: string;
  rootName: string;
  emptyDirectoryPaths?: string[];
  removedPaths?: string[];
  analysisSummary?: AnalysisSummary;
  securityFindings?: SecurityFinding[];
  exportMetadata?: {
    usesDefaultIgnorePatterns: boolean;
    usesGitignorePatterns: boolean;
    sortsByGitChangeCount: boolean;
  };
}
