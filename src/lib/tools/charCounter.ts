export interface TextStats {
  /** User-perceived characters (grapheme clusters): `é` and `👍🏽` count as 1. */
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  /** Size in UTF-8, which is what most databases and APIs limit. */
  bytes: number;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const words = new Intl.Segmenter(undefined, { granularity: 'word' });

export function countText(text: string): TextStats {
  const chars = Array.from(graphemes.segment(text), (s) => s.segment);
  return {
    characters: chars.length,
    charactersNoSpaces: chars.filter((c) => !/^\s+$/u.test(c)).length,
    words: Array.from(words.segment(text)).filter((s) => s.isWordLike).length,
    lines: text === '' ? 0 : text.split(/\r\n|\r|\n/).length,
    bytes: new TextEncoder().encode(text).length,
  };
}
