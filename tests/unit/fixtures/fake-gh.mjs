// Fake `gh` for tests/unit/deploymentState.test.ts. The test puts a link to (or copy of) the node
// binary named `gh` first on PATH and preloads this file with NODE_OPTIONS=--import, so the
// script under test finds it with a plain execFileSync('gh', …), no shell, on Windows and Linux.
// Node then sees `gh api <path> -q <filter>` as "run the script `api`", so argv[1] is `api`
// resolved against the working directory; every other process (the script itself) is ignored.
import { appendFileSync } from 'node:fs';
import { basename } from 'node:path';

if (basename(process.argv[1] ?? '') === 'api') {
  const args = ['api', ...process.argv.slice(2)];
  appendFileSync(process.env.FAKE_GH_LOG, `${JSON.stringify(args)}\n`);
  if (process.env.FAKE_GH_FAIL) {
    process.stderr.write('HTTP 401: Bad credentials\n');
    process.exit(1);
  }
  process.stdout.write(args.some((a) => a.endsWith('/statuses')) ? 'success\n' : '123\n');
  process.exit(0);
}
