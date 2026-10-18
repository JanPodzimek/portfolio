// Pure parts of scripts/deployment-state.mjs, unit-tested in tests/unit/deploymentState.test.ts.
// The only outside input is the commit sha; everything that reaches `gh api` is built here from
// a validated sha or a numeric id that gh itself returned.

const REPO = 'repos/JanPodzimek/portfolio';
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const DEPLOYMENT_ID = /^[0-9]+$/;
const STATE = /^[a-z_]+$/;

export const USAGE =
  'Usage: node scripts/deployment-state.mjs <sha> (40 lower-case hex characters)';

/** @param {unknown} value */
export function isCommitSha(value) {
  return typeof value === 'string' && COMMIT_SHA.test(value);
}

/** @param {string} sha */
export function deploymentsPath(sha) {
  if (!isCommitSha(sha)) throw new Error(USAGE);
  return `${REPO}/deployments?environment=Production&sha=${sha}`;
}

/** @param {string} id */
export function statusesPath(id) {
  if (!DEPLOYMENT_ID.test(id)) throw new Error(`Unexpected deployment id: ${JSON.stringify(id)}`);
  return `${REPO}/deployments/${id}/statuses`;
}

/**
 * gh prints an empty line (or `null`) when the jq filter finds nothing.
 * @param {string} output
 * @returns {string | null}
 */
export function parseId(output) {
  const id = output.trim();
  if (id === '' || id === 'null') return null;
  if (!DEPLOYMENT_ID.test(id)) throw new Error(`Unexpected deployment id: ${JSON.stringify(id)}`);
  return id;
}

/**
 * @param {string} output
 * @returns {string | null}
 */
export function parseState(output) {
  const state = output.trim();
  if (state === '' || state === 'null') return null;
  if (!STATE.test(state)) throw new Error(`Unexpected deployment state: ${JSON.stringify(state)}`);
  return state;
}

/**
 * @param {string | null} id
 * @param {string | null} state
 */
export function formatLine(id, state) {
  if (id === null) return 'deployment=none';
  return `deployment=${id} state=${state ?? 'none'}`;
}
