import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { buildImportContextFile, generateZipContext } from './importContextBuilder';

const EXACT_SAMPLE_OUTPUT = `This file is a merged representation of the current codebase, prepared by Structure Insight.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on detected ignore files and Structure Insight's export settings
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching default ignore patterns are excluded

================================================================
Directory Structure
================================================================
assets/
  logo.png
src/
  app.ts
README.md

================================================================
Files
================================================================

================
File: README.md
================
# Demo

================
File: src/app.ts
================
export const value = 1;




================================================================
End of Codebase
================================================================
`;

const setRelativePath = (file: File, relativePath: string) => {
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: relativePath,
  });

  return file;
};

describe('buildImportContextFile', () => {
  it('matches the Structure Insight plain TXT layout for a folder import', async () => {
    const readme = setRelativePath(new File(['# Demo\n'], 'README.md', { type: 'text/markdown' }), 'demo/README.md');
    const appFile = setRelativePath(
      new File(['export const value = 1;\n'], 'app.ts', { type: 'text/plain' }),
      'demo/src/app.ts',
    );
    const logo = setRelativePath(new File(['png'], 'logo.png', { type: 'image/png' }), 'demo/assets/logo.png');

    const contextFile = await buildImportContextFile([readme, appFile, logo]);

    expect(await contextFile.text()).toBe(EXACT_SAMPLE_OUTPUT);
  });

  it('keeps nested zip files in the directory structure without expanding them', async () => {
    const appFile = setRelativePath(
      new File(['export const value = 1;\n'], 'app.ts', { type: 'text/plain' }),
      'demo/src/app.ts',
    );
    const nestedZip = setRelativePath(
      new File(['fake zip'], 'docs.zip', { type: 'application/zip' }),
      'demo/downloads/docs.zip',
    );

    const contextFile = await buildImportContextFile([appFile, nestedZip]);
    const output = await contextFile.text();

    expect(output).toContain('downloads/');
    expect(output).toContain('  docs.zip');
    expect(output).not.toContain('File: downloads/docs.zip');
  });

  it('includes empty directories when requested', async () => {
    const appFile = setRelativePath(
      new File(['export const value = 1;\n'], 'app.ts', { type: 'text/plain' }),
      'demo/src/app.ts',
    );

    const contextFile = await buildImportContextFile([appFile], {
      emptyDirectoryPaths: ['demo/empty'],
      includeEmptyDirectories: true,
    });

    const output = await contextFile.text();
    expect(output).toContain('empty/');
  });
});

describe('generateZipContext', () => {
  it('expands top-level zip files before building the TXT output', async () => {
    const zip = new JSZip();
    zip.file('src/app.ts', 'export const zipped = true;\n');
    zip.file('README.md', '# Zipped Demo\n');

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], 'demo.zip', { type: 'application/zip' });

    const contextFile = await generateZipContext(zipFile);
    const output = await contextFile.text();

    expect(output).toContain('File: README.md');
    expect(output).toContain('File: src/app.ts');
    expect(output).toContain('export const zipped = true;');
  });
});
