// The pure parts of scripts/deployment-state.mjs: the only input that reaches `gh` is a commit
// sha, so it must be exactly 40 lower-case hex characters, and the deployment id gh returns
// must be numeric before it goes into the second path.
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
