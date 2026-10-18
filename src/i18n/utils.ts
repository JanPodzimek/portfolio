import { en, type Dict } from './en';
import { cs } from './cs';

export const locales = ['en', 'cs'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, Dict> = { en, cs };

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function t(locale: Locale): Dict {
  return dictionaries[locale];
}

/** Locale of a URL pathname: `/cs/...` is Czech, everything else English. */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return isLocale(first) && first !== defaultLocale ? first : defaultLocale;
}

/** Strip the locale prefix: `/cs/tools/` -> `/tools/`. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  const path = '/' + parts.join('/');
  return pathname.endsWith('/') && path !== '/' ? path + '/' : path;
}

/** Build a localized path: (`cs`, `/tools/`) -> `/cs/tools/`. Hash fragments are kept. */
export function localePath(locale: Locale, path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) return normalized;
  return normalized === '/' ? `/${locale}/` : `/${locale}${normalized}`;
}

/** Same page in another language. */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localePath(target, stripLocale(pathname));
}
