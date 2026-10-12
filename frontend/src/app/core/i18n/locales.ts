import { registerLocaleData } from '@angular/common';
import localeEnCa from '@angular/common/locales/en-CA';
import localeFrCa from '@angular/common/locales/fr-CA';

/** Language as it appears in the URL: /en/... and /fr/... */
export const URL_LANGS = ['en', 'fr'] as const;
export type UrlLang = (typeof URL_LANGS)[number];

/** Contentful locale codes, also used for date and number formatting. */
export type ContentLocale = 'en-CA' | 'fr-CA';

export const DEFAULT_URL_LANG: UrlLang = 'en';
export const DEFAULT_LOCALE: ContentLocale = 'en-CA';

const LOCALE_BY_LANG: Record<UrlLang, ContentLocale> = {
  en: 'en-CA',
  fr: 'fr-CA',
};

export function isUrlLang(value: unknown): value is UrlLang {
  return typeof value === 'string' && (URL_LANGS as readonly string[]).includes(value);
}

export function toLocale(lang: UrlLang): ContentLocale {
  return LOCALE_BY_LANG[lang];
}

let registered = false;

/** Registers Angular locale data for both languages. Safe to call more than once. */
export function registerLocales(): void {
  if (registered) return;
  registerLocaleData(localeEnCa, 'en-CA');
  registerLocaleData(localeFrCa, 'fr-CA');
  registered = true;
}
