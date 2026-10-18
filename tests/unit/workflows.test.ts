// Checks the GitHub Actions workflows that feed the required `branch-policy` check. A job skipped
// by `if:` still reports a check run, and GitHub counts a skipped required check as passed. So a
// push run (e.g. the push to develop) must never define a `branch-policy` job, or a release PR
// from that commit is "clean" before its own policy check has run.
// `yaml` is only a transitive dependency, so this reads the few keys it needs by indentation.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../../.github/workflows/', import.meta.url);
const workflows = readdirSync(dir)
  .filter((f) => /\.ya?ml$/.test(f))
  .map((file) => ({ file, text: readFileSync(new URL(file, dir), 'utf8').replace(/\r\n/g, '\n') }));

/** Lines of the block under top-level `key:` (indented lines up to the next top-level key). */
function block(text: string, key: string, indent = 0): { inline: string; lines: string[] } {
  const lines = text.split('\n');
  const pad = ' '.repeat(indent);
  const start = lines.findIndex((l) => l.startsWith(`${pad}${key}:`));
  if (start === -1) return { inline: '', lines: [] };
  const inline = lines[start]
    .slice(pad.length + key.length + 1)
    .replace(/\s+#.*$/, '')
    .trim();
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (line.length - line.trimStart().length <= indent) break;
    body.push(line);
  }
  return { inline, lines: body };
}

/** Keys directly under a block, at `indent` spaces. */
const childKeys = (lines: string[], indent: number) =>
  lines
    .filter((l) => l.length - l.trimStart().length === indent)
    .map((l) => /^\s*([\w-]+):/.exec(l)?.[1])
    .filter((k): k is string => k !== undefined);

/** Event names a workflow triggers on (`on: x`, `on: [a, b]` or a mapping). */
function triggers(text: string): string[] {
  const on = block(text, 'on');
  if (on.inline)
    return on.inline
      .replace(/[[\]]/g, '')
      .split(/\s*,\s*/)
      .filter(Boolean);
  return childKeys(on.lines, 2);
}

/** Jobs as { id, name, text }, where `name` is what the check run is called. */
function jobs(text: string) {
  const all = block(text, 'jobs').lines;
  const ids = childKeys(all, 2);
  return ids.map((id) => {
    const body = block(all.join('\n'), id, 2).lines.join('\n');
    const name = /^ {4}name:\s*(.+)$/m.exec(body)?.[1].trim() ?? id;
    return { id, name, text: body };
  });
}

describe('workflow parsing helpers', () => {
  it('reads triggers and jobs', () => {
    const sample =
      'on:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  a:\n    name: b\n';
    expect(triggers(sample)).toEqual(['push', 'pull_request']);
    expect(triggers('on: deployment_status\n')).toEqual(['deployment_status']);
    expect(jobs(sample).map((j) => j.name)).toEqual(['b']);
  });
});

describe('branch-policy check', () => {
  it('is never defined in a workflow triggered by push', () => {
    const offenders = workflows
      .filter((w) => triggers(w.text).includes('push'))
      .filter((w) =>
        jobs(w.text).some((j) => j.id === 'branch-policy' || j.name === 'branch-policy'),
      )
      .map((w) => w.file);
    expect(offenders).toEqual([]);
  });

  const policy = workflows.find((w) => w.file === 'branch-policy.yml');

  it('has its own workflow, triggered only by pull requests', () => {
    expect(policy, '.github/workflows/branch-policy.yml').toBeDefined();
    expect(triggers(policy!.text)).toEqual(['pull_request']);
    const types = block(block(policy!.text, 'on').lines.join('\n'), 'pull_request', 2).lines.join(
      '\n',
    );
    const list = /types:\s*\[([^\]]*)\]/.exec(types)?.[1].split(/\s*,\s*/);
    expect(list?.sort()).toEqual(['edited', 'opened', 'reopened', 'synchronize']);
  });

  it('runs the policy script against the PR head as the `branch-policy` check', () => {
    const all = jobs(policy?.text ?? '');
    expect(all.map((j) => j.name)).toEqual(['branch-policy']);
    const [job] = all;
    expect(job.text).not.toMatch(/^ {4}if:/m);
    expect(job.text).toContain('node scripts/check-branch-policy.mjs');
    expect(job.text).toMatch(
      /PR_HEAD_SHA:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/,
    );
    expect(job.text).toMatch(/fetch-depth:\s*0/);
  });
});
