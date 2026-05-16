import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../../..');

const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
const sourceImportSpecifierPattern =
  /\b(?:import|export)\b[\s\S]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|vi\.(?:mock|doMock|unmock|importActual|importMock)\s*(?:<[^>]+>)?\(\s*['"]([^'"]+)['"]/g;
const listProjectSourceFiles = (relativeDir: string): string[] => {
  const absoluteDir = path.join(projectRoot, relativeDir);
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      return listProjectSourceFiles(entryPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
};

describe('code style boundaries', () => {
  it('keeps lint coverage on TypeScript and local JavaScript tooling', () => {
    const packageJson = readProjectFile('package.json');
    const eslintConfig = readProjectFile('eslint.config.js');

    expect(packageJson).toContain('eslint . --ext .ts,.tsx,.js,.mjs --max-warnings=0');
    expect(eslintConfig).toContain("files: ['**/*.{js,mjs}']");
    expect(eslintConfig).toContain('@typescript-eslint/consistent-type-imports');
    expect(eslintConfig).toContain("files: ['src/test/**/*.{ts,tsx}']");
    expect(eslintConfig).toContain("'react-refresh/only-export-components': 'off'");
  });

  it('keeps local development pinned to the Node major used by CI and Docker', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as { engines?: Record<string, string> };
    const npmrc = readProjectFile('.npmrc');
    const zhReadme = readProjectFile('README.md');
    const enReadme = readProjectFile('README.en.md');

    expect(packageJson.engines?.node).toBe('>=26 <27');
    expect(npmrc).toContain('engine-strict=true');
    expect(zhReadme).toContain('Node.js 26');
    expect(enReadme).toContain('Node.js 26');
  });

  it('reuses build artifacts in docker CI instead of rebuilding the frontend twice', () => {
    const workflow = readProjectFile('.github/workflows/ci.yml');
    const dockerBuildJob = workflow.slice(workflow.indexOf('  docker-build:'));
    const apiDockerfile = readProjectFile('Dockerfile.api');

    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('name: production-build');
    expect(dockerBuildJob).toContain('actions/download-artifact@v4');
    expect(dockerBuildJob).not.toContain('npm ci --legacy-peer-deps');
    expect(dockerBuildJob).not.toContain('npm run build');
    expect(apiDockerfile).toContain('COPY server/dist /app/server/dist');
    expect(apiDockerfile).not.toContain('RUN npm run build:api');
  });

  it('keeps source imports on the app alias when crossing directories', () => {
    const offenders = listProjectSourceFiles('src')
      .filter((relativePath) => !relativePath.includes('/test/architecture/'))
      .filter((relativePath) => {
        const source = readProjectFile(relativePath);
        const sourceDir = path.dirname(path.join(projectRoot, relativePath));
        return Array.from(source.matchAll(sourceImportSpecifierPattern)).some((match) => {
          const specifier = match[1] ?? match[2] ?? match[3];
          if (!specifier || !specifier.startsWith('../')) return false;

          const absoluteTarget = path.resolve(sourceDir, specifier);
          return absoluteTarget.startsWith(path.join(projectRoot, 'src') + path.sep);
        });
      });

    expect(offenders).toEqual([]);
  });

  it('documents a cleanup script for local build and test artifacts', () => {
    const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.clean).toBe(
      'rm -rf dist coverage playwright-report test-results tmp-live-artifact-demo .playwright-visible-demo-profile .codex-dev-server.*',
    );
  });

  it('keeps Vite configuration focused on assembly instead of local API internals', () => {
    const viteConfig = readProjectFile('vite.config.ts');

    expect(viteConfig).toContain("from './vite/localApiPlugin'");
    expect(viteConfig).toContain("from './vite/chunks'");
    expect(viteConfig).not.toContain('const IMAGE_PROXY_PATH');
    expect(viteConfig).not.toContain('configurePreviewServer(server)');
  });

  it('keeps generated worker code out of hook orchestration files', () => {
    const keepAliveHook = readProjectFile('src/hooks/core/useBackgroundKeepAlive.ts');
    const pyodideService = readProjectFile('src/features/local-python/pyodideService.ts');
    const pyodideWorkerTemplate = readProjectFile('src/features/local-python/pyodideWorkerTemplate.ts');

    expect(keepAliveHook).toContain("new URL('./backgroundKeepAliveWorker.ts', import.meta.url)");
    expect(keepAliveHook).not.toContain('const WORKER_CODE');
    expect(keepAliveHook).not.toContain('new Blob([WORKER_CODE]');

    expect(pyodideService).toContain("from './pyodideWorkerTemplate'");
    expect(pyodideService).not.toContain('self.onmessage = async');
    expect(pyodideWorkerTemplate).toContain('__PYODIDE_BASE_URL__');
    expect(pyodideWorkerTemplate).toContain('self.onmessage = async');
  });

  it('keeps core type comments focused on domain meaning instead of change history', () => {
    const chatTypes = readProjectFile('src/types/chat.ts');

    expect(chatTypes).not.toMatch(/\/\/\s*Added (?:for|to)\b/);
  });

  it('routes browser runtime diagnostics through logService instead of direct console calls', () => {
    const allowedConsoleFiles = new Set([
      'src/services/logService.ts',
      'src/services/db/dbService.ts',
      'src/features/local-python/pyodideWorkerTemplate.ts',
      'src/utils/chat/session.ts',
      'src/utils/htmlPreviewScripts.ts',
    ]);

    const offenders = listProjectSourceFiles('src')
      .filter((relativePath) => !relativePath.includes('.test.'))
      .filter((relativePath) => !allowedConsoleFiles.has(relativePath))
      .filter((relativePath) => /\bconsole\.(?:debug|error|info|log|warn)\b/.test(readProjectFile(relativePath)));

    expect(offenders).toEqual([]);
  });
});
