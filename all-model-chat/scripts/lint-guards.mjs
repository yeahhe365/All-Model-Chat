import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const checks = [
  {
    file: 'apps/web/index.html',
    pattern: /<script\s+type="importmap">/m,
    message: 'importmap runtime mapping is not allowed in web index.html.',
  },
  {
    file: 'apps/web/index.html',
    pattern: /<link\s+rel="stylesheet"\s+href="\/index\.css">/m,
    message: 'stale /index.css entry reference detected in web index.html.',
  },
  {
    file: 'apps/web/utils/apiUtils.ts',
    pattern: /recordApiKeyUsage\(/m,
    message: 'raw key usage tracking call detected in apiUtils.ts.',
  },
];

let hasFailure = false;

for (const check of checks) {
  const targetPath = path.join(rootDir, check.file);
  const content = fs.readFileSync(targetPath, 'utf8');

  if (check.pattern.test(content)) {
    hasFailure = true;
    console.error(`[lint-guards] ${check.file}: ${check.message}`);
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log('[lint-guards] all guard checks passed.');
