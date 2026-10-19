// Branching policy, shared by the guard-git hook and the CI `branch-policy` check.
// Pure functions only: no I/O, so it is unit-tested in tests/unit/gitPolicy.test.ts.
//
// The hook is a guard rail for agents, not a sandbox. The real enforcement is the GitHub
// rulesets plus the CI `branch-policy` check. Deliberately out of scope here:
//   - plumbing that moves refs directly: `git update-ref`, `git fetch . X:develop`, …
//   - git run from PowerShell or other tools (the hook matcher is Bash only)
//   - scripts the command runs (`bash script.sh`, `npm run x`): only the command line is read
//
// The local review gate (no push of a work branch and no work PR before the local review loop
// approved HEAD) is a guard rail too: the approval marker is a plain file any process can write.
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

const REVIEW_HOW =
  'Run the local review loop of the work skill (/new-feature, /fix-bug, /new-tool or ' +
  '/add-content) until a fresh reviewer has no blocker, major or minor findings; it writes the ' +
  'current HEAD sha to .git/claude-review/approved (in the git dir, see git rev-parse ' +
  '--absolute-git-dir). Then push and open the PR.';

/**
 * Facts the hook reads about the branch checked out when the command starts; the policy stays
 * pure. `approved` is the sha in the approval marker ('' when missing or invalid),
 * `approvedIsAncestor` whether it is an ancestor of `head`, `onOrigin` whether the branch
 * already exists on origin (a PR may be open: a red-CI fix on top of the reviewed commit).
 * @typedef {{ head: string, approved: string, approvedIsAncestor: boolean, onOrigin: boolean }}
 *   ReviewFacts
 */

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
 * @typedef {{ words: string[], bare: boolean[], next: string }} SimpleCommand `bare[i]` is
 *   true when word i had no quoting at all; `next` is the operator that follows (`&&`, `||`,
 *   `;`, `|`, `&`, newline, `subst` for the end of a command substitution, '' at the end)
 */

/**
 * Split a shell command line into simple commands and each into words with quotes removed.
 * Command substitutions (`$(…)`, backticks), also inside double quotes, are command
 * boundaries: their commands are returned (before the command that contains them).
 * Redirections (`2>&1`, `> file`, `N>>file`, `&>`, `<`), comments and here-doc bodies are
 * dropped. Good enough for policy checks; it is not a full shell parser.
 * @param {string} command
 * @returns {SimpleCommand[]}
 */
function splitCommands(command) {
  /** @type {SimpleCommand[]} */
  const out = [];
  lex(command, 0, '', out);
  return out;
}

/**
 * @param {string} src
 * @param {number} start
 * @param {'' | ')' | '`'} close character that ends this (sub)command list
 * @param {SimpleCommand[]} out
 * @returns {number} index of the closing character, or src.length
 */
function lex(src, start, close, out) {
  /** @type {string[]} */
  let words = [];
  /** @type {boolean[]} */
  let bare = [];
  let word = '';
  let inWord = false;
  let quoted = false;
  /** @type {string | null} */
  let quote = null;
  let skipNextWord = false;
  let heredocNext = false;
  /** @type {string[]} */
  let heredocs = [];
  let depth = 0;

  const endWord = () => {
    if (inWord) {
      if (skipNextWord) {
        skipNextWord = false;
        if (heredocNext) heredocs.push(word);
        heredocNext = false;
      } else {
        words.push(word);
        bare.push(!quoted);
      }
    }
    word = '';
    inWord = false;
    quoted = false;
  };
  /** @param {string} op */
  const endCommand = (op) => {
    endWord();
    if (words.length) out.push({ words, bare, next: op });
    words = [];
    bare = [];
  };
  /** Lex a command substitution starting at `from`; its commands go to `out` first. */
  const substitute = (/** @type {number} */ from, /** @type {')' | '`'} */ closer) => {
    const end = lex(src, from, closer, out);
    word += '$()';
    inWord = true;
    quoted = true;
    return end;
  };

  const n = src.length;
  for (let i = start; i < n; i++) {
    const ch = src[i];
    const next = src[i + 1] ?? '';
    if (quote === "'") {
      if (ch === "'") quote = null;
      else word += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === '\\' && '"\\$`'.includes(next)) word += src[++i];
      else if (ch === '$' && next === '(') i = substitute(i + 2, ')');
      else if (ch === '`') i = substitute(i + 1, '`');
      else word += ch;
      continue;
    }
    if ((close === '`' && ch === '`') || (close === ')' && ch === ')' && depth === 0)) {
      endCommand('subst');
      return i;
    }
    if (ch === '\\') {
      i++;
      if (next !== '\n') {
        word += next;
        inWord = true;
        quoted = true;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
      quoted = true;
      continue;
    }
    if (ch === '$' && next === '(') {
      i = substitute(i + 2, ')');
      continue;
    }
    if (ch === '`') {
      i = substitute(i + 1, '`');
      continue;
    }
    if (ch === '#' && !inWord) {
      while (i + 1 < n && src[i + 1] !== '\n') i++;
      continue;
    }
    if (ch === '>' || ch === '<' || (ch === '&' && next === '>')) {
      // A word made only of digits right before the operator is a file descriptor: `2>`.
      if (inWord && !quoted && /^\d+$/.test(word) && !skipNextWord) {
        word = '';
        inWord = false;
      } else {
        endWord();
      }
      let op = '';
      while (i < n && '<>&'.includes(src[i])) op += src[i++];
      if (op.endsWith('&') && op.length > 1) {
        // `>&1`, `2>&-`: duplicates a descriptor, no file word follows
        const from = i;
        while (i < n && /[\d-]/.test(src[i])) i++;
        if (i === from) skipNextWord = true; // `>&file`
      } else {
        if ((op === '<<' || op === '<<<') && src[i] === '-') i++;
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
          const end = src.indexOf('\n', i + 1);
          const line = src.slice(i + 1, end < 0 ? n : end);
          i = end < 0 ? n : end;
          if (line.trim() === delimiter) break;
        }
      }
      heredocs = [];
      continue;
    }
    if (ch === ';' || ch === '&' || ch === '|') {
      const op = (ch === '&' || ch === '|') && next === ch ? ch + src[++i] : ch;
      endCommand(op);
      continue;
    }
    if (ch === '(' || ch === ')') {
      endWord();
      if (ch === '(') depth++;
      else if (depth > 0) depth--;
      continue;
    }
    if (/\s/.test(ch)) {
      endWord();
      continue;
    }
    word += ch;
    inWord = true;
  }
  endCommand('');
  return n;
}

const GIT_WORD = /(^|[/\\])git(\.exe)?$/;
const SHELL_WORD = /(^|[/\\])(ba|da|z|k|a)?sh(\.exe)?$/;
/** Words that may precede a command without changing what runs. */
const PREFIX_WORDS = new Set(['!', '{', 'if', 'then', 'elif', 'else', 'while', 'until', 'do']);
/** Prefix commands and their options that take a value. */
const PREFIX_COMMANDS = {
  time: [],
  nohup: [],
  exec: ['-a'],
  command: [],
  env: ['-u', '--unset', '-C', '--chdir', '-S', '--split-string'],
  xargs: ['-I', '-n', '-L', '-P', '-d', '-a', '-E', '-s', '--arg-file', '--delimiter'],
};

/**
 * Index of the word that actually runs: skips `VAR=value`, `!`, `{`, `if`/`then`/…, and
 * `time`, `nohup`, `exec`, `command`, `env`, `xargs` with their options.
 * @param {string[]} words
 */
function commandStart(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || PREFIX_WORDS.has(w)) {
      i++;
    } else if (Object.hasOwn(PREFIX_COMMANDS, w)) {
      const withValue = PREFIX_COMMANDS[/** @type {keyof typeof PREFIX_COMMANDS} */ (w)];
      i++;
      while (i < words.length && words[i].startsWith('-') && words[i] !== '-') {
        i += withValue.includes(words[i]) ? 2 : 1;
      }
    } else {
      break;
    }
  }
  return i;
}

/**
 * @typedef {{ sub: string, args: string[], chdirs: string[], otherRepo: boolean }} GitCall
 *   `chdirs` are the `-C` directories; `otherRepo` is true for `--git-dir`/`--work-tree`
 */

/**
 * Parse git's global options (`-C <dir>`, `-c <key=value>`, `--no-pager`, …) and the
 * subcommand, starting after the `git` word.
 * @param {string[]} words
 * @param {number} i index of the `git` word
 * @returns {GitCall | null}
 */
function parseGit(words, i) {
  /** @type {string[]} */
  const chdirs = [];
  let otherRepo = false;
  i++;
  while (i < words.length && words[i].startsWith('-')) {
    const opt = words[i];
    if (opt === '-C') chdirs.push(words[i + 1] ?? '');
    if (/^--(git-dir|work-tree)(=|$)/.test(opt)) otherRepo = true;
    i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(opt) ? 2 : 1;
  }
  if (i >= words.length) return null;
  return { sub: words[i], args: words.slice(i + 1), chdirs, otherRepo };
}

/**
 * Normalise a directory path for comparison: `\` → `/`, Git Bash `/c/…` → `c:/…`, lower-case
 * Windows paths, resolve `.` and `..`.
 * @param {string} path
 */
function normPath(path) {
  let s = path.replace(/\\/g, '/');
  const drive = /^\/([a-zA-Z])(\/|$)/.exec(s);
  if (drive) s = `${drive[1]}:/${s.slice(3)}`;
  if (/^[a-zA-Z]:/.test(s)) s = s.toLowerCase();
  const root = /^([a-z]:)?(\/)?/.exec(s) ?? ['', undefined, undefined];
  const prefix = root[1] ? `${root[1]}/` : root[2] ? '/' : '';
  /** @type {string[]} */
  const parts = [];
  for (const seg of s.slice(root[0].length).split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return prefix + parts.join('/');
}

/** @param {string} path */
const isAbsolute = (path) => /^([/\\]|[a-zA-Z]:[/\\]?)/.test(path);

/**
 * @param {string | null | undefined} base current directory: undefined = the starting
 *   directory when its path was not given, null = unknown
 * @param {string} path
 * @returns {string | null | undefined}
 */
function resolveDir(base, path) {
  if (!path || path.startsWith('~') || path === '-' || path.includes('$')) return null;
  if (isAbsolute(path)) return normPath(path);
  if (base === null) return null;
  if (base === undefined) return normPath(path) === '' ? undefined : null;
  return normPath(`${base}/${path}`);
}

/**
 * @param {string} dir normalised
 * @param {string} root normalised
 */
const isInside = (dir, root) =>
  dir === root || dir.startsWith(root.endsWith('/') ? root : `${root}/`);

/**
 * @typedef {object} State
 * @property {string | null} branch branch of the project repository, null when unknown
 * @property {string | null | undefined} dir current directory (see resolveDir)
 * @property {string | null} region directories whose git branch is `branch`
 * @property {ReviewFacts | undefined} review approval facts for `reviewBranch`; undefined = no gate
 * @property {string | null} reviewBranch branch checked out when the command starts
 * @property {boolean} headMoved an earlier part of the command may have moved HEAD
 */

/**
 * Whether `dir` belongs to the repository whose branch the state tracks.
 * @param {State} state
 * @param {string | null | undefined} dir
 */
const inRegion = (state, dir) =>
  dir === undefined || (dir !== null && state.region !== null && isInside(dir, state.region));

/** @param {string[]} args */
const positionals = (args) => args.filter((a) => !a.startsWith('-'));

/** @param {string} ref */
const stripHeads = (ref) => ref.replace(/^refs\/heads\//, '');

/**
 * The local review gate: publishing `branch` (push of a work branch, PR from it) needs an
 * approval for the commit that is published.
 * @param {State} state
 * @param {string | null} branch the branch that would be published, null when unknown
 * @returns {string | null}
 */
function checkReview(state, branch) {
  const review = state.review;
  if (!review) return null;
  const what = branch ? `${branch}` : 'this branch';
  if (branch === null || branch !== state.reviewBranch || state.headMoved) {
    return (
      `cannot check the local review for ${what}: only the branch checked out when the command ` +
      'starts can be published, with no commit or branch switch earlier in the same command. ' +
      'Publish it in a separate command. ' +
      REVIEW_HOW
    );
  }
  const { head, approved } = review;
  if (COMMIT_SHA.test(head) && approved === head) return null;
  if (COMMIT_SHA.test(approved) && review.approvedIsAncestor && review.onOrigin) return null;
  if (!COMMIT_SHA.test(approved)) {
    return `${what} has no local review approval. ${REVIEW_HOW}`;
  }
  return (
    `the local review approval is for ${approved.slice(0, 12)}, but HEAD is ` +
    `${head.slice(0, 12)} (new commits since the review, and no open PR branch on origin to ` +
    `fix). ${REVIEW_HOW}`
  );
}

/**
 * @param {string[]} args arguments after `git push`
 * @param {string | null} branch current branch, null when unknown
 * @param {(branch: string | null) => string | null} review the local review gate
 * @returns {string | null}
 */
function checkPush(args, branch, review) {
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

  /** @type {{ src: string | null, dst: string | null }[]} src null = the current branch */
  const targets = [];
  if (refspecs.length === 0 && !onlyTags) targets.push({ src: branch, dst: branch });
  for (const refspec of refspecs) {
    const colon = refspec.indexOf(':');
    const src = stripHeads(colon >= 0 ? refspec.slice(0, colon) : refspec);
    const dst = stripHeads(colon >= 0 ? refspec.slice(colon + 1) : refspec);
    const isTag = (/** @type {string} */ ref) => VERSION_TAG.test(ref) || TAG_REF.test(ref);
    if (deleting || (colon >= 0 && src === '')) {
      if (isTag(dst) || dst.startsWith('refs/tags/')) return `do not delete release tags (${dst}).`;
      if (RC_BRANCH.test(dst)) return `do not delete release branches (${dst}).`;
      if (dst === '') {
        return '"git push <remote> :" pushes every matching branch, including main and develop. Push one branch.';
      }
    } else if (isTag(src) && (colon < 0 || src === dst || `refs/tags/${src}` === dst)) {
      continue; // a plain release tag push
    }
    const isHead = (/** @type {string} */ ref) => ref === 'HEAD' || ref === '@';
    targets.push({ src: isHead(src) ? branch : src, dst: isHead(dst) ? branch : dst });
  }

  for (const { src, dst } of targets) {
    if (dst === null || dst === '') return `refusing to push: ${UNKNOWN_BRANCH}`;
    if (dst === 'HEAD') return 'refusing to push a detached HEAD. Push a named branch.';
    if (LONG_LIVED_BRANCH.test(dst)) {
      return `do not push to ${dst}; it only changes through pull requests. ${FLOW}`;
    }
    if (RC_BRANCH.test(dst) && src !== dst) {
      return `${dst} may only be pushed from the local ${dst} branch (created from origin/main); it receives other work only through a merge-commit PR from develop. ${FLOW}`;
    }
    if (!isWorkBranch(dst)) {
      return `pushing "${dst}" is not allowed. ${NAME_HINT} ${FLOW}`;
    }
  }
  if (!deleting) {
    for (const { src, dst } of targets) {
      if (!FEATURE_BRANCH.test(dst)) continue;
      // The facts are about the checked-out branch, so it must be pushed under its own name.
      const error = review(src === dst ? src : null);
      if (error) return error;
    }
  }
  return null;
}

/**
 * Value of an option that may be separate (`-c x`, `--create x`) or attached (`-cx`,
 * `--create=x`).
 * @param {string[]} args
 * @param {string[]} longs
 * @param {string[]} shorts
 * @returns {string | null}
 */
function optionValue(args, longs, shorts) {
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (longs.includes(a) || shorts.includes(a)) return args[k + 1] ?? null;
    for (const l of longs) if (a.startsWith(`${l}=`)) return a.slice(l.length + 1);
    for (const s of shorts) if (!a.startsWith('--') && a.startsWith(s)) return a.slice(s.length);
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
  if (sub === 'switch') {
    return optionValue(args, ['--create', '--force-create', '--orphan'], ['-c', '-C']);
  }
  if (sub === 'checkout') return optionValue(args, ['--orphan'], ['-b', '-B']);
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
 * A `git reset` argument that is certainly a path, never a commit or ref.
 * @param {string} arg
 */
function isPathArg(arg) {
  return (
    /[./]/.test(arg) &&
    !/[~^@:]/.test(arg) &&
    !/^(origin|upstream|refs)\//.test(arg) &&
    !VERSION_TAG.test(arg) &&
    !isWorkBranch(arg)
  );
}

/**
 * What is still allowed on a protected branch: fast-forward updates and unstaging.
 * @param {string} sub
 * @param {string[]} args
 * @param {string} branch
 */
function isAllowedOnProtected(sub, args, branch) {
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
  if (sub === 'reset') {
    // `git reset [-q] [HEAD] [--] <paths>` only unstages; any other commit or mode moves the branch.
    const sep = args.indexOf('--');
    const before = sep >= 0 ? args.slice(0, sep) : args;
    if (!before.every((a) => !a.startsWith('-') || a === '-q' || a === '--quiet')) return false;
    const revs = positionals(before);
    return sep >= 0
      ? revs.every((r) => r === 'HEAD')
      : revs.every((r) => r === 'HEAD' || isPathArg(r));
  }
  return false;
}

/**
 * @param {GitCall} git
 * @param {string | null} branch effective branch for this command
 * @param {(branch: string | null) => string | null} review the local review gate
 * @returns {string | null}
 */
function checkGitCall({ sub, args }, branch, review) {
  if (HISTORY_COMMANDS.includes(sub) && !args.some((a) => SEQUENCER_FLAGS.includes(a))) {
    if (branch === null) return `refusing to ${sub}: ${UNKNOWN_BRANCH}`;
    if (isProtected(branch) && !isAllowedOnProtected(sub, args, branch)) {
      if (RC_BRANCH.test(branch)) {
        return `do not ${sub} on ${branch}; a release branch only receives develop through a merge-commit PR. ${FLOW}`;
      }
      return (
        `do not ${sub} on ${branch}; it only changes through pull requests (fast-forward ` +
        `updates such as git pull --ff-only, and unstaging with git reset -- <paths>, are ` +
        `fine). Create a branch from develop ` +
        `(git switch develop && git pull && git switch -c feat/<slug>). ${FLOW}`
      );
    }
  }
  if (sub === 'push') {
    const error = checkPush(args, branch, review);
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
  return null;
}

const GH_WORD = /(^|[/\\])gh(\.exe)?$/;

/**
 * `gh pr create`: a PR from a work branch (or into develop, which only takes work branches)
 * needs the local review approval. Release PRs (`--head develop`, `--head rc/vX.Y.Z`) do not.
 * @param {string[]} args arguments after `gh pr create`
 * @param {State} state
 * @returns {string | null}
 */
function checkPrCreate(args, state) {
  const base = optionValue(args, ['--base'], ['-B']);
  const explicitHead = optionValue(args, ['--head'], ['-H']);
  const checkedOut = inRegion(state, state.dir) ? state.branch : null;
  const head = explicitHead === null ? checkedOut : explicitHead.replace(/^[^:]*:/, '');
  if (base !== 'develop' && head !== null && !FEATURE_BRANCH.test(head)) return null;
  return checkReview(state, head !== null && head === checkedOut ? head : null);
}

const RUN_PLAIN =
  'run git as a plain command (git … at the start, optionally after cd … &&). The guard ' +
  'cannot check git run through other programs or wrappers. If "git" is only an argument, ' +
  'quote it.';

/**
 * @param {string} command
 * @param {State} state updated as `cd` and branch switches are followed
 * @returns {string | null}
 */
function checkCommands(command, state) {
  for (const { words, bare, next } of splitCommands(command)) {
    const chained = next === '&&' || next === '';
    const start = commandStart(words);
    const head = words[start] ?? '';
    const isGit = bare[start] && GIT_WORD.test(head);
    for (let j = 0; j < words.length; j++) {
      if (bare[j] && GIT_WORD.test(words[j]) && !(isGit && j === start)) return RUN_PLAIN;
    }

    if (head === 'cd' || head === 'pushd' || head === 'popd') {
      const target = positionals(words.slice(start + 1))[0] ?? '';
      const dir = head === 'cd' ? resolveDir(state.dir, target) : null;
      state.dir = chained ? dir : null;
      continue;
    }

    if (SHELL_WORD.test(head) || head === 'eval') {
      let script = null;
      if (head === 'eval') {
        script = words.slice(start + 1).join(' ');
      } else {
        let j = start + 1;
        let hasC = false;
        while (j < words.length && words[j].startsWith('-')) {
          if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(words[j])) hasC = true;
          j += words[j] === '-o' || words[j] === '+o' ? 2 : 1;
        }
        if (hasC) script = words[j] ?? '';
      }
      if (script !== null) {
        const before = { dir: state.dir, branch: state.branch };
        const error = checkCommands(script, state);
        if (error) return error;
        state.dir = before.dir;
        if (state.branch !== before.branch) state.branch = null;
      }
      continue;
    }

    if (bare[start] && GH_WORD.test(head) && words[start + 1] === 'pr') {
      if (words[start + 2] === 'create') {
        const error = checkPrCreate(words.slice(start + 3), state);
        if (error) return error;
      }
      continue;
    }

    if (!isGit) continue;
    const git = parseGit(words, start);
    if (!git) continue;

    let dir = state.dir;
    for (const c of git.chdirs) dir = resolveDir(dir, c);
    const ownRepo = !git.otherRepo && inRegion(state, dir);
    const branch = ownRepo ? state.branch : null;

    const error = checkGitCall(git, branch, (b) => checkReview(state, b));
    if (error) return error;

    const after = branchAfter(git.sub, git.args);
    if (after !== undefined || HISTORY_COMMANDS.includes(git.sub)) state.headMoved = true;
    if (after !== undefined) {
      if (ownRepo) state.branch = chained ? after : null;
      else state.branch = null; // may have been this repository after all
    }
  }
  return null;
}

/**
 * Check a shell command an agent wants to run against the branching policy.
 *
 * Branch changes (`git switch`, `git checkout`) and directory changes (`cd`, `git -C`) are
 * followed through `&&` chains; after any other operator the state counts as unknown, and
 * history-changing commands are blocked while the branch is unknown. Outside the project
 * directory the branch is unknown. Command substitutions and `sh -c` / `eval` strings are
 * checked too; git started any other way (as an argument of another program) is blocked.
 * @param {string} command the full shell command line
 * @param {string} currentBranch branch checked out in `cwd` when the command starts
 *   ('' if unknown, 'HEAD' if detached)
 * A push of a feat/fix branch and `gh pr create` for one also need `context.review` to show
 * that the local review loop approved HEAD (see ReviewFacts). Without `context.review` that gate
 * is off; the guard-git hook always passes it.
 * @param {{ projectDir?: string, cwd?: string, review?: ReviewFacts }} [context] where the
 *   command starts (`cwd`, defaults to `projectDir`), the project whose branch is
 *   `currentBranch`, and the review approval facts for `currentBranch`
 * @returns {string | null} an explanation when the command is blocked
 */
export function checkGitCommand(command, currentBranch, context = {}) {
  const homeRaw = context.cwd || context.projectDir;
  const home = homeRaw ? normPath(homeRaw) : undefined;
  const project = context.projectDir ? normPath(context.projectDir) : null;
  /** @type {State} */
  const state = {
    branch: currentBranch || null,
    dir: home,
    region: home === undefined ? null : project && isInside(home, project) ? project : home,
    review: context.review,
    reviewBranch: currentBranch || null,
    headMoved: false,
  };
  return checkCommands(command, state);
}
