import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const buildVitestNodeArgs = (allowedFlags, vitestArgs) => {
  const args = [];

  if (allowedFlags.has('--no-experimental-webstorage')) {
    args.push('--no-experimental-webstorage');
  }

  args.push('./node_modules/vitest/vitest.mjs', ...vitestArgs);
  return args;
};

const runVitest = () => {
  const args = buildVitestNodeArgs(
    process.allowedNodeEnvironmentFlags,
    process.argv.slice(2),
  );

  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }

  process.exit(1);
};

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runVitest();
}
