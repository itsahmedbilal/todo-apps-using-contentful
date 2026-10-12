import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LanguageService } from './language.service';

const KEY = 'todo.lang';

function browserLanguages(languages: string[]) {
  vi.spyOn(Navigator.prototype, 'languages', 'get').mockReturnValue(languages);
}

function create(): LanguageService {
  TestBed.resetTestingModule();
  return TestBed.inject(LanguageService);
}

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    browserLanguages(['en-US']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('initial language order: URL, saved preference, browser language, English', () => {
    it('uses the language in the URL first, over everything else', () => {
      localStorage.setItem(KEY, 'en');
      browserLanguages(['en-CA']);
      expect(create().resolveInitial('fr')).toBe('fr');
    });

    it('uses the saved preference when the URL has no language', () => {
      localStorage.setItem(KEY, 'fr');
      browserLanguages(['en-CA']);
      expect(create().resolveInitial(null)).toBe('fr');
    });

    it('uses the browser language when nothing is saved', () => {
      browserLanguages(['fr-CA', 'en']);
      expect(create().resolveInitial(null)).toBe('fr');
    });

    it('takes the first supported browser language from the list', () => {
      browserLanguages(['de-DE', 'fr-FR', 'en-US']);
      expect(create().resolveInitial(undefined)).toBe('fr');
    });

    it('falls back to English when the browser language is not supported', () => {
      browserLanguages(['de-DE', 'es']);
      expect(create().resolveInitial(null)).toBe('en');
    });

    it('falls back to English when the browser reports no languages', () => {
      browserLanguages([]);
      expect(create().resolveInitial(null)).toBe('en');
    });
  });

  describe('unsupported values', () => {
    it('ignores an unsupported language in the URL', () => {
      localStorage.setItem(KEY, 'fr');
      expect(create().resolveInitial('de')).toBe('fr');
    });

    it('ignores an unsupported saved value', () => {
      localStorage.setItem(KEY, 'klingon');
      browserLanguages(['fr']);
      expect(create().resolveInitial(null)).toBe('fr');
    });
  });

  describe('when storage is not available', () => {
    it('still resolves a language if reading throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });
      browserLanguages(['fr']);
      expect(create().resolveInitial(null)).toBe('fr');
    });

    it('still changes the language if saving throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });
      const service = create();
      expect(() => service.setLanguage('fr')).not.toThrow();
      expect(service.urlLang()).toBe('fr');
    });
  });

  describe('the active language', () => {
    it('starts from the resolved initial language', () => {
      localStorage.setItem(KEY, 'fr');
      const service = create();
      expect(service.urlLang()).toBe('fr');
      expect(service.locale()).toBe('fr-CA');
    });

    it('activate changes the language without saving it', () => {
      const service = create();
      service.activate('fr');
      expect(service.urlLang()).toBe('fr');
      expect(service.locale()).toBe('fr-CA');
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('setLanguage changes the language and remembers it for the next visit', () => {
      create().setLanguage('fr');
      expect(localStorage.getItem(KEY)).toBe('fr');
      expect(create().urlLang()).toBe('fr');
    });
  });
});
