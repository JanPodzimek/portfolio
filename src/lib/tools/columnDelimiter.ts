export type QuoteStyle = 'none' | 'double' | 'single';

export interface DelimitOptions {
  /** Separator placed between records. Use `decodeDelimiter` for user input like `\t`. */
  delimiter: string;
  quote: QuoteStyle;
  /** `true`: `a,b,c`. `false`: one record per line with the delimiter at line end. */
  singleLine: boolean;
  removeDuplicates: boolean;
}

export interface DelimitResult {
  output: string;
  count: number;
}

export const defaultDelimitOptions: DelimitOptions = {
  delimiter: ',',
  quote: 'none',
  singleLine: true,
  removeDuplicates: false,
};

const quoteChars: Record<QuoteStyle, string> = { none: '', double: '"', single: "'" };

/** Split input into records: one per line, trimmed, empty lines skipped. */
export function parseRecords(input: string): string[] {
  return input
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const escapes: Record<string, string> = { t: '\t', n: '\n', '\\': '\\' };

/** Turn escape sequences typed by the user (`\t`, `\n`, `\\`) into real characters. */
export function decodeDelimiter(raw: string): string {
  return raw.replace(/\\([tn\\])/g, (_, ch: string) => escapes[ch]);
}

/** Wrap in quotes; an embedded quote is escaped by doubling it (SQL and CSV style). */
export function quoteRecord(record: string, quote: QuoteStyle): string {
  const q = quoteChars[quote];
  return q ? q + record.split(q).join(q + q) + q : record;
}

export function delimit(input: string, options: DelimitOptions): DelimitResult {
  let records = parseRecords(input);
  if (options.removeDuplicates) records = [...new Set(records)];
  const separator = options.singleLine ? options.delimiter : options.delimiter + '\n';
  return {
    output: records.map((r) => quoteRecord(r, options.quote)).join(separator),
    count: records.length,
  };
}
