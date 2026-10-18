// Shared helpers for Claude Code hook scripts.

/** Hook input arrives as one JSON document on stdin. */
export async function readStdinJson() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}
