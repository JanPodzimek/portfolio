import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { cs } from '@/i18n/cs';
import { localeFromPath, localePath, stripLocale, switchLocalePath } from '@/i18n/utils';

/** Flatten a dictionary to `path -> value` so both languages can be compared key by key. */
function flatten(value: unknown, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      for (const [p, leaf] of flatten(v, prefix ? `${prefix}.${k}` : k)) out.set(p, leaf);
    }
  } else {
    out.set(prefix, value);
  }
  return out;
}

describe('dictionaries', () => {
  const enFlat = flatten(en);
  const csFlat = flatten(cs);

  it('have exactly the same keys and list lengths in English and Czech', () => {
    expect([...csFlat.keys()].sort()).toEqual([...enFlat.keys()].sort());
  });

  it('have no empty strings', () => {
    for (const [lang, flat] of [
      ['en', enFlat],
      ['cs', csFlat],
    ] as const) {
      for (const [key, value] of flat) {
        expect(typeof value === 'string' && value.trim() === '', `${lang}:${key}`).toBe(false);
      }
    }
  });
});

describe('locale paths', () => {
  it.each([
    ['/', 'en'],
    ['/tools/', 'en'],
    ['/cs/', 'cs'],
    ['/cs/tools/char-counter/', 'cs'],
    ['/cs', 'cs'],
    ['/csv-export/', 'en'],
  ])('detects the locale of %s as %s', (path, locale) => {
    expect(localeFromPath(path)).toBe(locale);
  });

  it('builds localized paths without prefixing the default locale', () => {
    expect(localePath('en', '/')).toBe('/');
    expect(localePath('en', '/tools/')).toBe('/tools/');
    expect(localePath('cs', '/')).toBe('/cs/');
    expect(localePath('cs', '/tools/')).toBe('/cs/tools/');
    expect(localePath('cs', 'tools/')).toBe('/cs/tools/');
  });

  it('strips the locale prefix and keeps trailing slashes', () => {
    expect(stripLocale('/cs/tools/')).toBe('/tools/');
    expect(stripLocale('/cs/')).toBe('/');
    expect(stripLocale('/cs')).toBe('/');
    expect(stripLocale('/tools')).toBe('/tools');
  });

  it('switches the same page between languages', () => {
    expect(switchLocalePath('/tools/column-delimiter/', 'cs')).toBe('/cs/tools/column-delimiter/');
    expect(switchLocalePath('/cs/tools/column-delimiter/', 'en')).toBe('/tools/column-delimiter/');
    expect(switchLocalePath('/', 'cs')).toBe('/cs/');
    expect(switchLocalePath('/cs/', 'en')).toBe('/');
  });
});
