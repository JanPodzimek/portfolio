// Shared helpers for the tests that read the skills and agents (.claude/**): which files they
// are and which shell commands they tell Claude to run.
import { readdirSync, readFileSync } from 'node:fs';

export const root = new URL('../../', import.meta.url);

/** Placeholders in the docs become sample values: `<slug>` → `x`, `vX.Y.Z` → `v1.2.3`. */
export const concrete = (command: string) =>
  command
    .replace(/vX\.Y\.Z/g, 'v1.2.3')
    .replace(/<[^>]+>/g, 'x')
    .trim();

/** Commands in fenced `sh` blocks and inline git/gh/curl/npm/npx/node code, split on `&&`. */
export function commandsIn(markdown: string): string[] {
  const commands: string[] = [];
  for (const [, block] of markdown.matchAll(/```sh\n([\s\S]*?)```/g)) {
    for (const line of block.split('\n')) {
      const command = line.replace(/\s+#\s.*$/, '').trim();
      if (command) commands.push(command);
    }
  }
  for (const [, inline] of markdown.matchAll(/`((?:git|gh|curl|npm|npx|node) [^`]+)`/g))
    commands.push(inline);
  return commands.flatMap((c) => c.split('&&')).map(concrete);
}

export const skills = readdirSync(new URL('.claude/skills/', root)).map(
  (d) => `.claude/skills/${d}/SKILL.md`,
);
export const docs = [
  ...skills,
  ...readdirSync(new URL('.claude/agents/', root)).map((f) => `.claude/agents/${f}`),
];
export const text = (file: string) => readFileSync(new URL(file, root), 'utf8');
