/**
 * Registry of QA tools. Drives the /tools hub, the homepage teaser and the
 * i18n parity test. Title/description text lives in i18n under `tools.<key>`.
 */
export const tools = [
  {
    slug: 'column-delimiter',
    key: 'columnDelimiter',
    source: 'src/lib/tools/columnDelimiter.ts',
    tests: ['tests/unit/columnDelimiter.test.ts', 'tests/e2e/column-delimiter.spec.ts'],
  },
  {
    slug: 'char-counter',
    key: 'charCounter',
    source: 'src/lib/tools/charCounter.ts',
    tests: ['tests/unit/charCounter.test.ts', 'tests/e2e/char-counter.spec.ts'],
  },
] as const;

export type Tool = (typeof tools)[number];
export type ToolKey = Tool['key'];
