import { describe, expect, it } from 'vitest';
import {
  decodeDelimiter,
  defaultDelimitOptions,
  delimit,
  parseRecords,
  quoteRecord,
  type DelimitOptions,
} from '@/lib/tools/columnDelimiter';

const run = (input: string, overrides: Partial<DelimitOptions> = {}) =>
  delimit(input, { ...defaultDelimitOptions, ...overrides });

describe('parseRecords', () => {
  it('splits on every newline style', () => {
    expect(parseRecords('a\nb\r\nc\rd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('trims records and skips blank lines', () => {
    expect(parseRecords('  a  \n\n   \n\tb\t\n')).toEqual(['a', 'b']);
  });

  it('returns nothing for empty or whitespace-only input', () => {
    expect(parseRecords('')).toEqual([]);
    expect(parseRecords(' \n \n')).toEqual([]);
  });
});

describe('decodeDelimiter', () => {
  it.each([
    ['\\t', '\t'],
    ['\\n', '\n'],
    ['\\\\', '\\'],
    [',', ','],
    [' OR ', ' OR '],
    ['', ''],
  ])('decodes %j to %j', (raw, expected) => {
    expect(decodeDelimiter(raw)).toBe(expected);
  });
});

describe('quoteRecord', () => {
  it('leaves records untouched without quotes', () => {
    expect(quoteRecord("O'Brien", 'none')).toBe("O'Brien");
  });

  it('escapes embedded single quotes SQL-style', () => {
    expect(quoteRecord("O'Brien", 'single')).toBe("'O''Brien'");
  });

  it('escapes embedded double quotes CSV-style', () => {
    expect(quoteRecord('say "hi"', 'double')).toBe('"say ""hi"""');
  });
});

describe('delimit', () => {
  it('joins records with a comma by default', () => {
    expect(run('1\n2\n3')).toEqual({ output: '1,2,3', count: 3 });
  });

  it('supports any delimiter, including tab and multi-character ones', () => {
    expect(run('a\nb', { delimiter: ';' }).output).toBe('a;b');
    expect(run('a\nb', { delimiter: '\t' }).output).toBe('a\tb');
    expect(run('a\nb', { delimiter: ' OR ' }).output).toBe('a OR b');
  });

  it('wraps each record in the chosen quotes (SQL IN clause)', () => {
    expect(run('A1\nB2', { quote: 'single' }).output).toBe("'A1','B2'");
    expect(run('A1\nB2', { quote: 'double' }).output).toBe('"A1","B2"');
  });

  it('puts one record per line when single line is off', () => {
    expect(run('a\nb\nc', { singleLine: false }).output).toBe('a,\nb,\nc');
  });

  it('removes duplicates while keeping the first occurrence order', () => {
    expect(run('b\na\nb\nc\na', { removeDuplicates: true })).toEqual({
      output: 'b,a,c',
      count: 3,
    });
  });

  it('treats records that differ only by surrounding whitespace as duplicates', () => {
    expect(run('x\n x \nx  ', { removeDuplicates: true }).count).toBe(1);
  });

  it('keeps duplicates by default and counts them', () => {
    expect(run('a\na').count).toBe(2);
  });

  it('is case-sensitive when removing duplicates', () => {
    expect(run('a\nA', { removeDuplicates: true }).count).toBe(2);
  });

  it('returns an empty result for empty input', () => {
    expect(run('')).toEqual({ output: '', count: 0 });
  });

  it('handles a single record without adding a delimiter', () => {
    expect(run('only', { quote: 'single', singleLine: false }).output).toBe("'only'");
  });

  it('keeps unicode records intact', () => {
    expect(run('Příliš\nžluťoučký\n🐴', { quote: 'double' }).output).toBe(
      '"Příliš","žluťoučký","🐴"',
    );
  });
});
