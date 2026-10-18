import { describe, expect, it } from 'vitest';
import { countText } from '@/lib/tools/charCounter';

describe('countText', () => {
  it('returns zeros for empty text', () => {
    expect(countText('')).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      bytes: 0,
    });
  });

  it('counts plain ASCII text', () => {
    expect(countText('Hello world')).toEqual({
      characters: 11,
      charactersNoSpaces: 10,
      words: 2,
      lines: 1,
      bytes: 11,
    });
  });

  it('counts Czech diacritics as one character but two UTF-8 bytes', () => {
    const stats = countText('žluťoučký kůň');
    expect(stats.characters).toBe(13);
    expect(stats.words).toBe(2);
    // 7 ASCII bytes + 6 accented letters (ž ť č ý ů ň) x 2 bytes.
    expect(stats.bytes).toBe(19);
  });

  it('counts a combining sequence as one character', () => {
    // "e" + combining acute accent renders as one "é".
    expect(countText('é').characters).toBe(1);
  });

  it('counts emoji with modifiers and ZWJ sequences as one character', () => {
    expect(countText('👍🏽').characters).toBe(1);
    expect(countText('👨‍👩‍👧').characters).toBe(1);
    expect(countText('👍🏽').bytes).toBe(8);
  });

  it('counts lines for every newline style, including a trailing newline', () => {
    expect(countText('a\nb\r\nc\rd').lines).toBe(4);
    expect(countText('a\n').lines).toBe(2);
  });

  it('excludes all whitespace kinds from the no-spaces count', () => {
    expect(countText('a b\tc\nd e').charactersNoSpaces).toBe(5);
  });

  it('does not count punctuation or numbers-only separators as words', () => {
    expect(countText('Hello, world! — 42').words).toBe(3);
  });
});
