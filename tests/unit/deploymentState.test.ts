// The pure parts of scripts/deployment-state.mjs: the only input that reaches `gh` is a commit
// sha, so it must be exactly 40 lower-case hex characters, and the deployment id gh returns
// must be numeric before it goes into the second path.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  deploymentsPath,
  formatLine,
  isCommitSha,
  parseId,
  parseState,
  statusesPath,
} from '../../scripts/lib/deployment-state.mjs';

const sha = '0123456789abcdef0123456789abcdef01234567';
const script = fileURLToPath(new URL('../../scripts/deployment-state.mjs', import.meta.url));

describe('deployment-state: sha validation', () => {
  it('accepts a full lower-case commit sha', () => {
    expect(isCommitSha(sha)).toBe(true);
  });

  it.each([
    ['upper case', sha.toUpperCase()],
    ['short', sha.slice(0, 7)],
    ['too long', `${sha}0`],
    ['empty', ''],
    ['not hex', 'g'.repeat(40)],
    ['query injection', `${sha}&environment=Preview`],
    ['path injection', `${sha}/../../rulesets`],
    ['flag', `-X POST ${sha}`],
    ['shell', `${sha}; gh repo delete`],
    ['trailing newline', `${sha}\n`],
    ['undefined', undefined],
  ])('rejects %s', (_, value) => {
    expect(isCommitSha(value)).toBe(false);
    expect(() => deploymentsPath(value as string)).toThrow();
  });
});

describe('deployment-state: paths', () => {
  it('queries Production deployments of the commit in the path', () => {
    expect(deploymentsPath(sha)).toBe(
      `repos/JanPodzimek/portfolio/deployments?environment=Production&sha=${sha}`,
    );
  });

  it('builds the statuses path from a numeric id only', () => {
    expect(statusesPath('7156480962')).toBe(
      'repos/JanPodzimek/portfolio/deployments/7156480962/statuses',
    );
    for (const id of ['', '1/../../rulesets', '1?x=y', '-1', '1 2'])
      expect(() => statusesPath(id)).toThrow();
  });
});

describe('deployment-state: gh output', () => {
  it('reads the id, and no deployment as none', () => {
    expect(parseId('7156480962\n')).toBe('7156480962');
    expect(parseId('\n')).toBeNull();
    expect(parseId('')).toBeNull();
    expect(parseId('null\n')).toBeNull();
    expect(() => parseId('<html>')).toThrow();
  });

  it('reads the state, and no status as none', () => {
    expect(parseState('success\n')).toBe('success');
    expect(parseState('in_progress')).toBe('in_progress');
    expect(parseState('\n')).toBeNull();
    expect(parseState('null')).toBeNull();
    expect(() => parseState('success; rm -rf')).toThrow();
  });

  it('prints one line', () => {
    expect(formatLine('7156480962', 'success')).toBe('deployment=7156480962 state=success');
    expect(formatLine('7156480962', null)).toBe('deployment=7156480962 state=none');
    expect(formatLine(null, null)).toBe('deployment=none');
  });
});

describe('deployment-state: command line', () => {
  it.each([[[]], [['abc']], [[sha.toUpperCase()]], [[sha, 'extra']]])(
    'exits 2 with usage for %j without calling gh',
    (args) => {
      const result = spawnSync(process.execPath, [script, ...args], {
        encoding: 'utf8',
        // An empty PATH proves gh is never reached: running it would fail differently.
        env: { ...process.env, PATH: '' },
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/usage: node scripts\/deployment-state\.mjs <sha>/i);
      expect(result.stdout).toBe('');
    },
  );
});

// End to end with a fake `gh` first on PATH (see tests/unit/fixtures/fake-gh.mjs): the script
// runs exactly these two read-only calls and prints their result. No test-only switch in the
// script: it still runs the plain `gh` from PATH, as in production.
describe('deployment-state: calls to gh', () => {
  let dir = '';

  // Set up in beforeAll, not at collection time, so a failing link is a failed test.
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'fake-gh-'));
    // A symlink is enough where allowed; Windows without developer mode needs a hard link.
    const gh = join(dir, process.platform === 'win32' ? 'gh.exe' : 'gh');
    try {
      symlinkSync(process.execPath, gh);
    } catch {
      try {
        linkSync(process.execPath, gh);
      } catch {
        // Last resort, in practice Windows only (Linux CI takes the symlink): when neither a
        // symlink nor a hard link is possible, e.g. node on another volume, copy the node
        // binary (~100 MB). It is removed again in afterAll.
        copyFileSync(process.execPath, gh);
      }
    }
  });
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function run(args: string[], extraEnv: Record<string, string> = {}) {
    const log = join(dir, 'calls.jsonl');
    writeFileSync(log, '');
    const pathKey = Object.keys(process.env).find((k) => /^path$/i.test(k)) ?? 'PATH';
    const fake = pathToFileURL(fileURLToPath(new URL('./fixtures/fake-gh.mjs', import.meta.url)));
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        [pathKey]: `${dir}${delimiter}${process.env[pathKey] ?? ''}`,
        NODE_OPTIONS: `--import ${JSON.stringify(fake.href)}`,
        FAKE_GH_LOG: log,
        ...extraEnv,
      },
    });
    const calls = readFileSync(log, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as string[]);
    return { ...result, calls };
  }

  it('makes the two GET calls and prints one line', () => {
    const { status, stdout, stderr, calls } = run([sha]);
    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(calls).toEqual([
      [
        'api',
        `repos/JanPodzimek/portfolio/deployments?environment=Production&sha=${sha}`,
        '-q',
        '.[0].id',
      ],
      ['api', 'repos/JanPodzimek/portfolio/deployments/123/statuses', '-q', '.[0].state'],
    ]);
    for (const arg of calls.flat())
      expect(arg).not.toMatch(/^-(X|f|F)|^--(method|field|raw-field|input)/);
    expect(stdout).toBe('deployment=123 state=success\n');
  });

  // /deploy treats a non-zero exit as "the lookup failed", never as `deployment=none`.
  it('exits non-zero and prints no result when gh fails', () => {
    const { status, stdout, stderr } = run([sha], { FAKE_GH_FAIL: '1' });
    expect(status).not.toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toContain('HTTP 401');
  });

  it('never calls gh for an invalid sha', () => {
    const { status, calls } = run([`${sha}&environment=Preview`]);
    expect(status).toBe(2);
    expect(calls).toEqual([]);
  });
});
