// Branching policy, shared by the guard-git hook and the CI `branch-policy` check.
// Pure functions only: no I/O, so it is unit-tested in tests/unit/gitPolicy.test.ts.
//
//   feat/<slug> ─┐ squash
//   fix/<slug>  ─┴──▶ develop ──merge commit──▶ rc/vX.Y.Z ──merge commit──▶ main ──▶ production
//                                                 ▲ always created from the current main

export const FEATURE_BRANCH = /^(feat|fix)\/[a-z0-9]+(-[a-z0-9]+)*$/;
export const RC_BRANCH = /^rc\/v\d+\.\d+\.\d+$/;
export const LONG_LIVED_BRANCH = /^(main|master|develop)$/;
const PRODUCTION_BRANCH = /^(main|master)$/;
const VERSION_TAG = /^v\d+\.\d+\.\d+$/;
const TAG_REF = /^refs\/tags\/v\d+\.\d+\.\d+$/;
const COMMIT_SHA = /^([0-9a-f]{40}|[0-9a-f]{64})$/;

export const FLOW =
  'Flow: feat/<slug> or fix/<slug> (from develop) → squash PR into develop → ' +
  'rc/vX.Y.Z (created from current main) ← merge-commit PR from develop → ' +
  'merge-commit PR rc/vX.Y.Z into main → tag vX.Y.Z.';

const NAME_HINT =
  'Branch names: feat/<slug> or fix/<slug> (lowercase, digits, single hyphens, ' +
  'e.g. feat/tool-json-formatter), or rc/vX.Y.Z for a release.';

const UNKNOWN_BRANCH =
  'cannot tell which branch this runs on (git branch unreadable, or an earlier part of the ' +
  'command changes branches in a way the guard cannot follow). Check out the branch first.';

/** Commands that rewrite or add history on the current branch. */
const HISTORY_COMMANDS = [
  'commit',
  'merge',
  'cherry-pick',
  'rebase',
  'reset',
  'am',
  'revert',
  'pull',
];
/** Flags that only continue or stop an operation that was already allowed to start. */
const SEQUENCER_FLAGS = ['--abort', '--continue', '--quit', '--skip'];

/** @param {string} branch */
const isWorkBranch = (branch) => FEATURE_BRANCH.test(branch) || RC_BRANCH.test(branch);
/** @param {string} branch */
const isProtected = (branch) => LONG_LIVED_BRANCH.test(branch) || RC_BRANCH.test(branch);

/**
 * Which pull requests the flow allows.
 * @param {string} base branch the PR merges into
 * @param {string} head branch the PR comes from
 * @returns {string | null} an explanation when the PR is not allowed
 */
export function checkPrBranches(base, head) {
  if (PRODUCTION_BRANCH.test(base)) {
    if (RC_BRANCH.test(head)) return null;
    return (
      `${base} only accepts merge-commit PRs from rc/vX.Y.Z, not from "${head}". ` +
      (FEATURE_BRANCH.test(head) ? 'Target develop instead. ' : '') +
      FLOW
    );
  }
  if (RC_BRANCH.test(base)) {
    if (head === 'develop') return null;
    return (
      `${base} only accepts a merge-commit PR from develop, not from "${head}". ` +
      (FEATURE_BRANCH.test(head) ? 'Target develop instead. ' : '') +
      FLOW
    );
  }
  if (base === 'develop') {
    if (FEATURE_BRANCH.test(head)) return null;
    return `develop only accepts squash PRs from feat/<slug> or fix/<slug>, not from "${head}". ${NAME_HINT} ${FLOW}`;
  }
  return `PRs may only target develop, rc/vX.Y.Z or main, not "${base}". ${FLOW}`;
}

/**
 * @typedef {{ status: 'skip' | 'fail' | 'pass', message: string }
 *   | { status: 'check-ancestry', message: string, ancestor: string, commit: string }} PrCheckPlan
 */

/**
 * Decide what the CI `branch-policy` job must do for a pull request.
 * A release PR rc/vX.Y.Z → main also needs an ancestry check (the rc must contain the current
 * main), which the caller runs with `git merge-base --is-ancestor <ancestor> <commit>`.
 * @param {{ base?: string, head?: string, headSha?: string }} pr GITHUB_BASE_REF,
 *   GITHUB_HEAD_REF and the PR head commit (on pull_request events HEAD is GitHub's synthetic
 *   merge commit, which always contains the base, so it cannot be used)
 * @returns {PrCheckPlan}
 */
export function planPrCheck({ base = '', head = '', headSha = '' }) {
  if (!base || !head) {
    return {
      status: 'skip',
      message: 'Not a pull request (GITHUB_BASE_REF/GITHUB_HEAD_REF unset); nothing to check.',
    };
  }
  const error = checkPrBranches(base, head);
  if (error) {
    return { status: 'fail', message: `Branch policy: ${head} → ${base} is not allowed. ${error}` };
  }
  if (PRODUCTION_BRANCH.test(base) && RC_BRANCH.test(head)) {
    if (!COMMIT_SHA.test(headSha)) {
      return {
        status: 'fail',
        message:
          'Branch policy: PR_HEAD_SHA (the PR head commit) is missing or invalid, so it cannot ' +
          `be checked that ${head} contains the current ${base}.`,
      };
    }
    return {
      status: 'check-ancestry',
      ancestor: `origin/${base}`,
      commit: headSha,
      message:
        `Branch policy: ${head} does not contain the current origin/${base}. Release branches ` +
        `must be created from the current ${base}: git fetch origin && git switch -c ${head} ` +
        `origin/${base} (recreate the rc if ${base} moved).`,
    };
  }
  return { status: 'pass', message: `Branch policy OK: ${head} → ${base}.` };
}

/**
 * @typedef {{ words: string[], next: string }} SimpleCommand `next` is the operator that
 *   follows (`&&`, `||`, `;`, `|`, `&`, newline, or '' at the end)
 */

/**
 * Split a shell command line into simple commands and each into words with quotes removed.
 * Redirections (`2>&1`, `> file`, `N>>file`, `&>`, `<`), comments and here-doc bodies are
 * dropped. Good enough for policy checks; it is not a full shell parser.
 * @param {string} command
 * @returns {SimpleCommand[]}
 */
function splitCommands(command) {
  /** @type {SimpleCommand[]} */
  const commands = [];
  /** @type {string[]} */
  let words = [];
  let word = '';
  let inWord = false;
  /** @type {string | null} */
  let quote = null;
  let skipNextWord = false;
  let heredocNext = false;
  /** @type {string[]} */
  let heredocs = [];

  const endWord = () => {
    if (inWord) {
      if (skipNextWord) {
        skipNextWord = false;
        if (heredocNext) heredocs.push(word);
        heredocNext = false;
      } else {
        words.push(word);
      }
    }
    word = '';
    inWord = false;
  };
  /** @param {string} op */
  const endCommand = (op) => {
    endWord();
    if (words.length) commands.push({ words, next: op });
    words = [];
  };

  const n = command.length;
  for (let i = 0; i < n; i++) {
    const ch = command[i];
    const next = command[i + 1] ?? '';
    if (quote) {
      if (ch === quote) quote = null;
      else if (quote === '"' && ch === '\\' && '"\\$`'.includes(next)) word += command[++i];
      else word += ch;
      continue;
    }
    if (ch === '\\') {
      i++;
      if (next !== '\n') {
        word += next;
        inWord = true;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
      continue;
    }
    if (ch === '#' && !inWord) {
      while (i + 1 < n && command[i + 1] !== '\n') i++;
      continue;
    }
    if (ch === '>' || ch === '<' || (ch === '&' && next === '>')) {
      // A word made only of digits right before the operator is a file descriptor: `2>`.
      if (inWord && /^\d+$/.test(word) && !skipNextWord) {
        word = '';
        inWord = false;
      } else {
        endWord();
      }
      let op = '';
      while (i < n && '<>&'.includes(command[i])) op += command[i++];
      if (op.endsWith('&') && op.length > 1) {
        // `>&1`, `2>&-`: duplicates a descriptor, no file word follows
        const start = i;
        while (i < n && /[\d-]/.test(command[i])) i++;
        if (i === start) skipNextWord = true; // `>&file`
      } else {
        if ((op === '<<' || op === '<<<') && command[i] === '-') i++;
        skipNextWord = true;
        heredocNext = op === '<<';
      }
      i--;
      continue;
    }
    if (ch === '\n') {
      endCommand('\n');
      for (const delimiter of heredocs) {
        while (i < n) {
          const end = command.indexOf('\n', i + 1);
          const line = command.slice(i + 1, end < 0 ? n : end);
          i = end < 0 ? n : end;
          if (line.trim() === delimiter) break;
        }
      }
      heredocs = [];
      continue;
    }
    if (ch === ';' || ch === '&' || ch === '|') {
      const op = (ch === '&' || ch === '|') && next === ch ? ch + command[++i] : ch;
      endCommand(op);
      continue;
    }
    if (/\s/.test(ch) || ch === '(' || ch === ')') {
      endWord();
      continue;
    }
    word += ch;
    inWord = true;
  }
  endCommand('');
  return commands;
}

/**
 * Find a git invocation in a simple command: skips `VAR=value` prefixes, a leading `command`
 * or `env`, and git's global options (`-C <dir>`, `-c <key=value>`, `--no-pager`, …).
 * @param {string[]} words
 * @returns {{ sub: string, args: string[] } | null}
 */
function parseGit(words) {
  let i = 0;
  for (;;) {
    const w = words[i] ?? '';
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || w === 'command' || w === 'env') i++;
    else if (i > 0 && words[i - 1] === 'env' && w.startsWith('-')) i++;
    else break;
  }
  if (!/(^|[/\\])git(\.exe)?$/.test(words[i] ?? '')) return null;
  i++;
  while (i < words.length && words[i].startsWith('-')) {
    const opt = words[i];
    i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(opt) ? 2 : 1;
  }
  if (i >= words.length) return null;
  return { sub: words[i], args: words.slice(i + 1) };
}

/** @param {string[]} args */
const positionals = (args) => args.filter((a) => !a.startsWith('-'));

/**
 * @param {string[]} args arguments after `git push`
 * @param {string | null} branch current branch, null when unknown
 * @returns {string | null}
 */
function checkPush(args, branch) {
  /** @type {string[]} */
  const positional = [];
  let onlyTags = false;
  let deleting = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (
      /^--force(-with-lease|-if-includes)?(=|$)/.test(arg) ||
      /^-[a-zA-Z]*f[a-zA-Z]*$/.test(arg)
    ) {
      return 'force pushes are not allowed.';
    }
    if (arg === '--all' || arg === '--mirror' || arg === '--branches') {
      return `"git push ${arg}" would push main and develop too. Push one branch: git push -u origin <branch>.`;
    }
    if (arg === '--tags') onlyTags = true;
    if (arg === '--delete' || /^-[a-zA-Z]*d[a-zA-Z]*$/.test(arg)) deleting = true;
    if (['-o', '--push-option', '--repo', '--receive-pack', '--exec'].includes(arg)) i++;
    else if (!arg.startsWith('-')) positional.push(arg);
  }
  const refspecs = positional.slice(1);
  if (refspecs.some((r) => r.startsWith('+'))) return 'force pushes (+refspec) are not allowed.';

  /** @type {(string | null)[]} */
  const targets = [];
  if (refspecs.length === 0 && !onlyTags) targets.push(branch);
  for (const refspec of refspecs) {
    const colon = refspec.indexOf(':');
    const src = colon >= 0 ? refspec.slice(0, colon) : refspec;
    const dst = colon >= 0 ? refspec.slice(colon + 1) : refspec;
    const isTag = (/** @type {string} */ ref) => VERSION_TAG.test(ref) || TAG_REF.test(ref);
    if (deleting || (colon >= 0 && src === '')) {
      if (isTag(dst) || dst.startsWith('refs/tags/')) return `do not delete release tags (${dst}).`;
      if (dst === '') {
        return '"git push <remote> :" pushes every matching branch, including main and develop. Push one branch.';
      }
    } else if (isTag(src) && (colon < 0 || src === dst || `refs/tags/${src}` === dst)) {
      continue; // a plain release tag push
    }
    const name = dst.replace(/^refs\/heads\//, '');
    targets.push(name === 'HEAD' || name === '@' ? branch : name);
  }

  for (const target of targets) {
    if (target === null || target === '') return `refusing to push: ${UNKNOWN_BRANCH}`;
    if (target === 'HEAD') return 'refusing to push a detached HEAD. Push a named branch.';
    if (LONG_LIVED_BRANCH.test(target)) {
      return `do not push to ${target}; it only changes through pull requests. ${FLOW}`;
    }
    if (!isWorkBranch(target)) {
      return `pushing "${target}" is not allowed. ${NAME_HINT} ${FLOW}`;
    }
  }
  return null;
}

/**
 * Name of a branch the command would create or rename to, if any.
 * @param {string} sub
 * @param {string[]} args
 * @returns {string | null}
 */
function createdBranch(sub, args) {
  const valueAfter = (/** @type {string[]} */ flags) => {
    const i = args.findIndex((a) => flags.includes(a));
    return i >= 0 ? (args[i + 1] ?? null) : null;
  };
  if (sub === 'switch') return valueAfter(['-c', '-C', '--create', '--force-create', '--orphan']);
  if (sub === 'checkout') return valueAfter(['-b', '-B', '--orphan']);
  if (sub === 'branch') {
    const names = positionals(args);
    if (args.some((a) => ['-m', '-M', '--move', '-c', '-C', '--copy'].includes(a))) {
      return names.length ? names[names.length - 1] : null;
    }
    const creationFlags = /^(-f|--force|-t|--track(=.*)?|--no-track|-q|--quiet|--create-reflog)$/;
    if (args.every((a) => !a.startsWith('-') || creationFlags.test(a))) return names[0] ?? null;
  }
  return null;
}

/**
 * The branch checked out after a `git switch` / `git checkout`; `undefined` when the command
 * does not change branches, null when the guard cannot tell.
 * @param {string} sub
 * @param {string[]} args
 * @returns {string | null | undefined}
 */
function branchAfter(sub, args) {
  if (sub !== 'switch' && sub !== 'checkout') return undefined;
  const created = createdBranch(sub, args);
  if (created !== null) return created;
  if (args.includes('--detach') || args.includes('-d')) return 'HEAD';
  if (sub === 'checkout' && args.includes('--')) return undefined; // restores paths
  const names = positionals(args);
  if (names.length === 0) {
    return sub === 'checkout' && !args.some((a) => a.startsWith('-')) ? undefined : null;
  }
  if (names.length > 1 || args.includes('-')) return null;
  const [name] = names;
  if (sub === 'switch') return name;
  // `git checkout x` may restore a file called x: only follow names that look like branches.
  return isWorkBranch(name) || LONG_LIVED_BRANCH.test(name) ? name : null;
}

/**
 * Allowed ways to bring a protected branch up to date: fast-forward only.
 * @param {string} sub
 * @param {string[]} args
 * @param {string} branch
 */
function isFastForwardUpdate(sub, args, branch) {
  const names = positionals(args);
  if (sub === 'pull') {
    const flagsOk = args.every(
      (a) => !a.startsWith('-') || ['--ff-only', '-q', '--quiet', '-p', '--prune'].includes(a),
    );
    return flagsOk && names.length <= 2 && (names.length < 2 || names[1] === branch);
  }
  if (sub === 'merge') {
    const upstream = [`origin/${branch}`, '@{u}', '@{upstream}'];
    return (
      args.includes('--ff-only') &&
      args.every((a) => !a.startsWith('-') || ['--ff-only', '-q', '--quiet'].includes(a)) &&
      names.length === 1 &&
      upstream.includes(names[0])
    );
  }
  return false;
}

/**
 * Check a shell command an agent wants to run against the branching policy. Branch changes
 * (`git switch`, `git checkout`) are followed through `&&` chains; after any other operator
 * the branch counts as unknown, and history-changing commands are blocked while it is unknown.
 * @param {string} command the full shell command line
 * @param {string} currentBranch branch checked out when the command starts ('' if unknown,
 *   'HEAD' if detached)
 * @returns {string | null} an explanation when the command is blocked
 */
export function checkGitCommand(command, currentBranch) {
  /** @type {string | null} */
  let branch = currentBranch || null;
  for (const { words, next } of splitCommands(command)) {
    const git = parseGit(words);
    if (!git) continue;
    const { sub, args } = git;

    if (HISTORY_COMMANDS.includes(sub) && !args.some((a) => SEQUENCER_FLAGS.includes(a))) {
      if (branch === null) return `refusing to ${sub}: ${UNKNOWN_BRANCH}`;
      if (isProtected(branch) && !isFastForwardUpdate(sub, args, branch)) {
        if (RC_BRANCH.test(branch)) {
          return `do not ${sub} on ${branch}; a release branch only receives develop through a merge-commit PR. ${FLOW}`;
        }
        return (
          `do not ${sub} on ${branch}; it only changes through pull requests (fast-forward ` +
          `updates such as git pull --ff-only are fine). Create a branch from develop ` +
          `(git switch develop && git pull && git switch -c feat/<slug>). ${FLOW}`
        );
      }
    }

    if (sub === 'push') {
      const error = checkPush(args, branch);
      if (error) return error;
    }

    if (sub === 'tag' && args.some((a) => /^(--delete|--force|-[a-zA-Z]*[df][a-zA-Z]*)$/.test(a))) {
      return 'deleting or moving tags is not allowed; release tags are permanent.';
    }

    if (sub === 'switch' || sub === 'checkout' || sub === 'branch') {
      const name = createdBranch(sub, args);
      if (name !== null && !isWorkBranch(name)) {
        return `"${name}" is not an allowed branch name. ${NAME_HINT}`;
      }
    }

    const after = branchAfter(sub, args);
    if (after !== undefined) branch = next === '&&' || next === '' ? after : null;
  }
  return null;
}
