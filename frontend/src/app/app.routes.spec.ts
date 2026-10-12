import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { loadFakeContent, provideFakeContent, sentinel } from '../testing/fake-content';
import { LanguageService } from './core/i18n/language.service';
import { routes } from './app.routes';

async function setup(lang: 'en' | 'fr' = 'en') {
  TestBed.configureTestingModule({ providers: [provideRouter(routes), ...provideFakeContent()] });
  await loadFakeContent(lang);
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  return { harness, router, language: TestBed.inject(LanguageService) };
}

function heading(harness: RouterTestingHarness): string | null | undefined {
  return harness.routeNativeElement?.querySelector('h1')?.textContent;
}

describe('routes', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Navigator.prototype, 'languages', 'get').mockReturnValue(['en-US']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('a supported language in the address', () => {
    it('accepts /en and makes English active', async () => {
      const { harness, router, language } = await setup('fr');
      await harness.navigateByUrl('/en');
      expect(router.url).toBe('/en');
      expect(language.urlLang()).toBe('en');
    });

    it('accepts /fr and makes French active', async () => {
      const { harness, router, language } = await setup();
      await harness.navigateByUrl('/fr');
      expect(router.url).toBe('/fr');
      expect(language.urlLang()).toBe('fr');
    });

    it('does not save the language just because the address had it', async () => {
      const { harness } = await setup();
      await harness.navigateByUrl('/fr');
      expect(localStorage.getItem('todo.lang')).toBeNull();
    });

    it('takes priority over a saved preference', async () => {
      localStorage.setItem('todo.lang', 'fr');
      const { harness, router } = await setup();
      await harness.navigateByUrl('/en/anything');
      expect(router.url).toBe('/en/anything');
    });
  });

  describe('a missing language', () => {
    it('sends the root address to English by default', async () => {
      const { harness, router } = await setup();
      await harness.navigateByUrl('/');
      expect(router.url).toBe('/en');
    });

    it('sends the root address to the saved language', async () => {
      localStorage.setItem('todo.lang', 'fr');
      const { harness, router } = await setup();
      await harness.navigateByUrl('/');
      expect(router.url).toBe('/fr');
    });

    it('sends the root address to the browser language when nothing is saved', async () => {
      vi.spyOn(Navigator.prototype, 'languages', 'get').mockReturnValue(['fr-CA']);
      const { harness, router } = await setup();
      await harness.navigateByUrl('/');
      expect(router.url).toBe('/fr');
    });

    it('adds the language in front of a page address', async () => {
      const { harness, router } = await setup();
      await harness.navigateByUrl('/help');
      expect(router.url).toBe('/en/help');
    });

    it('keeps the query string when it adds the language', async () => {
      localStorage.setItem('todo.lang', 'fr');
      const { harness, router } = await setup();
      await harness.navigateByUrl('/help?topic=1');
      expect(router.url).toBe('/fr/help?topic=1');
    });
  });

  describe('an unsupported language in the address', () => {
    it('falls back to the default language', async () => {
      const { harness, router } = await setup();
      await harness.navigateByUrl('/de');
      expect(router.url).toBe('/en');
    });

    it('keeps the rest of the address', async () => {
      const { harness, router } = await setup();
      await harness.navigateByUrl('/de/help');
      expect(router.url).toBe('/en/help');
    });

    it('uses the saved language as the fallback', async () => {
      localStorage.setItem('todo.lang', 'fr');
      const { harness, router } = await setup();
      await harness.navigateByUrl('/es/help');
      expect(router.url).toBe('/fr/help');
    });

    it('treats a different letter case as unsupported', async () => {
      const { harness, router } = await setup();
      await harness.navigateByUrl('/EN/help');
      expect(router.url).toBe('/en/help');
    });
  });

  describe('an unknown page', () => {
    it('shows the not-found page in English', async () => {
      const { harness } = await setup('en');
      await harness.navigateByUrl('/en/nowhere');
      expect(heading(harness)).toBe(sentinel('notFound.heading', 'en-CA'));
    });

    it('shows the not-found page in French', async () => {
      const { harness } = await setup('fr');
      await harness.navigateByUrl('/fr/nowhere/deeper');
      expect(heading(harness)).toBe(sentinel('notFound.heading', 'fr-CA'));
    });

    it('shows the not-found page after the language was fixed up', async () => {
      const { harness, router } = await setup('en');
      await harness.navigateByUrl('/nowhere');
      expect(router.url).toBe('/en/nowhere');
      expect(heading(harness)).toBe(sentinel('notFound.heading', 'en-CA'));
    });
  });
});
