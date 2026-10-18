// PostToolUse (Edit|Write): run Prettier on the file Claude just changed.
// Never blocks: a formatting problem is reported by `npm run format:check` in CI.
import { spawnSync } from 'node:child_process';
import { extname, relative, resolve } from 'node:path';
import { readStdinJson, projectDir } from './lib.mjs';

const input = await readStdinJson();
const file = input?.tool_input?.file_path;
const root = projectDir();
const formattable = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.astro',
  '.css',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

if (file && formattable.has(extname(file))) {
  const rel = relative(root, resolve(file));
  const outside = rel.startsWith('..') || /^(node_modules|dist|\.astro)[\\/]/.test(rel);
  if (!outside) {
    spawnSync('npx', ['prettier', '--write', '--log-level', 'warn', rel], {
      cwd: root,
      shell: process.platform === 'win32',
      stdio: 'ignore',
    });
  }
}
process.exit(0);
