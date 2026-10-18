// Release gate fallback (/deploy step 5): print the newest Production deployment of a commit
// and its latest status as one line, `deployment=<id> state=<state>` or `deployment=none`.
// The agent may not run `gh api` itself (gh's grouped short flags such as `-iXPOST` defeat
// glob permission rules), so this script is the one allowed read. It only sends GETs, runs gh
// without a shell, and passes nothing to it but paths built from the validated sha and the
// numeric id gh returned. The logic is in ./lib/deployment-state.mjs (unit-tested).
import { execFileSync } from 'node:child_process';
import {
  USAGE,
  deploymentsPath,
  formatLine,
  isCommitSha,
  parseId,
  parseState,
  statusesPath,
} from './lib/deployment-state.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || !isCommitSha(args[0])) {
  console.error(USAGE);
  process.exit(2);
}

/** GET `path` and apply the jq filter `query`; no fields, no method flag. */
const get = (path, query) =>
  execFileSync('gh', ['api', path, '-q', query], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

const id = parseId(get(deploymentsPath(args[0]), '.[0].id'));
const state = id === null ? null : parseState(get(statusesPath(id), '.[0].state'));
console.log(formatLine(id, state));
