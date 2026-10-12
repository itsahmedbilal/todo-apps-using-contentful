import { NumberSymbol, getLocaleNumberSymbol } from '@angular/common';
import { DEFAULT_URL_LANG, isUrlLang, registerLocales, toLocale } from './locales';

describe('locales', () => {
  it('maps the URL languages en and fr to en-CA and fr-CA', () => {
    expect(toLocale('en')).toBe('en-CA');
    expect(toLocale('fr')).toBe('fr-CA');
  });

  it('defaults to English', () => {
    expect(DEFAULT_URL_LANG).toBe('en');
  });

  it('accepts only en and fr as URL languages', () => {
    expect(isUrlLang('en')).toBe(true);
    expect(isUrlLang('fr')).toBe(true);
    for (const value of ['de', 'EN', 'fr-CA', 'en-CA', '', null, undefined, 5, {}]) {
      expect(isUrlLang(value)).toBe(false);
    }
  });

  it('registers Angular locale data for both languages', () => {
    registerLocales();
    // The decimal separator differs between the two, and reading it throws if the data is missing.
    expect(getLocaleNumberSymbol('en-CA', NumberSymbol.Decimal)).toBe('.');
    expect(getLocaleNumberSymbol('fr-CA', NumberSymbol.Decimal)).toBe(',');
  });

  it('can be called more than once', () => {
    expect(() => {
      registerLocales();
      registerLocales();
    }).not.toThrow();
  });
});
