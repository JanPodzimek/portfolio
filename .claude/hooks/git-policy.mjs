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

export const FLOW =
  'Flow: feat/<slug> or fix/<slug> (from develop) → squash PR into develop → ' +
  'rc/vX.Y.Z (created from current main) ← merge-commit PR from develop → ' +
  'merge-commit PR rc/vX.Y.Z into main → tag vX.Y.Z.';

const NAME_HINT =
  'Branch names: feat/<slug> or fix/<slug> (lowercase, digits, single hyphens, ' +
  'e.g. feat/tool-json-formatter), or rc/vX.Y.Z for a release.';

/** @param {string} branch */
const isWorkBranch = (branch) => FEATURE_BRANCH.test(branch) || RC_BRANCH.test(branch);

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
 * Split a shell command line into simple commands (on unquoted `&&`, `||`, `;`, `|`, `&`,
 * newlines) and each into words with quotes removed. Good enough for policy checks; it is not
 * a full shell parser.
 * @param {string} command
 * @returns {string[][]}
 */
function splitCommands(command) {
  /** @type {string[][]} */
  const commands = [];
  /** @type {string[]} */
  let words = [];
  let word = '';
  let inWord = false;
  /** @type {string | null} */
  let quote = null;
  const endWord = () => {
    if (inWord) words.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      else word += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
    } else if (';&|\n'.includes(ch)) {
      endCommand();
    } else if (/\s/.test(ch)) {
      endWord();
    } else if ((ch === '(' || ch === ')') && !inWord) {
      endWord();
    } else {
      word += ch;
      inWord = true;
    }
  }
  endCommand();
  return commands;
}

/**
 * Find a git invocation in a simple command: skips `VAR=value` prefixes and git's global
 * options (`-C <dir>`, `-c <key=value>`, `--no-pager`, …).
 * @param {string[]} words
 * @returns {{ sub: string, args: string[] } | null}
 */
function parseGit(words) {
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
  if (!/(^|[/\\])git(\.exe)?$/.test(words[i] ?? '')) return null;
  i++;
  while (i < words.length && words[i].startsWith('-')) {
    const opt = words[i];
    i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(opt) ? 2 : 1;
  }
  if (i >= words.length) return null;
  return { sub: words[i], args: words.slice(i + 1) };
}

/** @param {string} branch */
function invalidNameMessage(branch) {
  return `"${branch}" is not an allowed branch name. ${NAME_HINT}`;
}

/**
 * @param {string[]} args arguments after `git push`
 * @param {string} currentBranch
 * @returns {string | null}
 */
function checkPush(args, currentBranch) {
  /** @type {string[]} */
  const positional = [];
  let pushesTags = false;
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
    if (arg === '--tags' || arg === '--follow-tags') pushesTags = true;
    if (['-o', '--push-option', '--repo', '--receive-pack', '--exec'].includes(arg)) i++;
    else if (!arg.startsWith('-')) positional.push(arg);
  }
  const refspecs = positional.slice(1);
  if (refspecs.some((r) => r.startsWith('+'))) return 'force pushes (+refspec) are not allowed.';

  /** @type {string[]} */
  const targets = [];
  if (refspecs.length === 0) {
    if (pushesTags) return null;
    targets.push(currentBranch);
  }
  for (const refspec of refspecs) {
    const colon = refspec.lastIndexOf(':');
    let dst = colon >= 0 ? refspec.slice(colon + 1) : refspec;
    if (dst === '' && colon >= 0) continue; // `git push origin :` – matching refs, git's default
    if (dst.startsWith('refs/tags/') || VERSION_TAG.test(dst)) continue;
    dst = dst.replace(/^refs\/heads\//, '');
    if (dst === 'HEAD' || dst === '@') dst = currentBranch;
    targets.push(dst);
  }

  for (const target of targets) {
    if (!target || target === 'HEAD') continue; // detached HEAD or unknown: git decides
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
  const positional = args.filter((a) => !a.startsWith('-'));
  const valueAfter = (/** @type {string[]} */ flags) => {
    const i = args.findIndex((a) => flags.includes(a));
    return i >= 0 ? (args[i + 1] ?? null) : null;
  };
  if (sub === 'switch') return valueAfter(['-c', '-C', '--create', '--force-create']);
  if (sub === 'checkout') return valueAfter(['-b', '-B', '--orphan']);
  if (sub === 'branch') {
    if (args.some((a) => ['-m', '-M', '--move', '-c', '-C', '--copy'].includes(a))) {
      return positional.length ? positional[positional.length - 1] : null;
    }
    const creationFlags = /^(-f|--force|-t|--track(=.*)?|--no-track|-q|--quiet|--create-reflog)$/;
    if (args.every((a) => !a.startsWith('-') || creationFlags.test(a))) {
      return positional[0] ?? null;
    }
  }
  return null;
}

/**
 * Check a shell command an agent wants to run against the branching policy.
 * @param {string} command the full shell command line
 * @param {string} currentBranch branch checked out when the command starts ('' if unknown)
 * @returns {string | null} an explanation when the command is blocked
 */
export function checkGitCommand(command, currentBranch) {
  for (const words of splitCommands(command)) {
    const git = parseGit(words);
    if (!git) continue;
    const { sub, args } = git;

    if (sub === 'commit' || sub === 'merge') {
      if (sub === 'merge' && args.some((a) => ['--abort', '--quit', '--continue'].includes(a))) {
        continue;
      }
      if (LONG_LIVED_BRANCH.test(currentBranch)) {
        return (
          `do not ${sub} on ${currentBranch}. Create a branch from develop in a separate ` +
          `command first (git switch develop && git pull, then git switch -c feat/<slug>). ${FLOW}`
        );
      }
      if (RC_BRANCH.test(currentBranch)) {
        return `do not ${sub} on ${currentBranch}; a release branch only receives develop through a merge-commit PR. ${FLOW}`;
      }
    }

    if (sub === 'push') {
      const error = checkPush(args, currentBranch);
      if (error) return error;
    }

    if (sub === 'switch' || sub === 'checkout' || sub === 'branch') {
      const name = createdBranch(sub, args);
      if (name !== null && !isWorkBranch(name)) return invalidNameMessage(name);
    }
  }
  return null;
}
