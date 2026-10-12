import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  KEY_MISSING_IN_FRENCH,
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { LanguageService } from '../i18n/language.service';
import { RawContent, RawEntry, UiLabelFields } from './content.models';
import { ContentService } from './content.service';
import { ContentStore } from './content.store';

function label(key: string, en: string, fr?: string): RawEntry<UiLabelFields> {
  return {
    sys: { id: `uiLabel-${key}` },
    fields: {
      key: { 'en-CA': key },
      value: fr === undefined ? { 'en-CA': en } : { 'en-CA': en, 'fr-CA': fr },
    },
  };
}

function withLabels(...labels: RawEntry<UiLabelFields>[]): RawContent {
  return { ...fakeRawContent(), uiLabels: labels };
}

describe('ContentStore', () => {
  describe('loading', () => {
    it('starts idle and becomes ready after loading', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = TestBed.inject(ContentStore);
      expect(store.status()).toBe('idle');
      await store.load();
      expect(store.status()).toBe('ready');
    });

    it('loads only once, even if asked again or at the same time', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = TestBed.inject(ContentStore);
      const service = TestBed.inject(ContentService);
      await Promise.all([store.load(), store.load()]);
      await store.load();
      expect(service.loadAll).toHaveBeenCalledTimes(1);
    });

    it('moves to error when loading fails and keeps the cause', async () => {
      const cause = new Error('network down');
      TestBed.configureTestingModule({ providers: provideFakeContent(cause) });
      const store = TestBed.inject(ContentStore);
      await store.load();
      expect(store.status()).toBe('error');
      expect(store.error()).toBe(cause);
    });

    it('recovers when retry succeeds after a failure', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const service = TestBed.inject(ContentService) as unknown as {
        loadAll: ReturnType<typeof vi.fn>;
      };
      service.loadAll.mockRejectedValueOnce(new Error('first attempt fails'));
      const store = TestBed.inject(ContentStore);

      await store.load();
      expect(store.status()).toBe('error');

      await store.retry();
      expect(store.status()).toBe('ready');
      expect(store.error()).toBeNull();
      expect(store.text('button.save').text).toBe(sentinel('button.save', 'en-CA'));
    });
  });

  describe('language and fallback', () => {
    it('returns text in the active language', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      expect(store.text('button.save')).toEqual({
        text: sentinel('button.save', 'fr-CA'),
        lang: 'fr-CA',
      });
    });

    it('updates when the language changes, without loading again', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.text('button.save').text).toBe(sentinel('button.save', 'en-CA'));

      TestBed.inject(LanguageService).activate('fr');
      expect(store.text('button.save').text).toBe(sentinel('button.save', 'fr-CA'));
      expect(TestBed.inject(ContentService).loadAll).toHaveBeenCalledTimes(1);
    });

    it('falls back to English, field by field, when French is missing', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      expect(store.text(KEY_MISSING_IN_FRENCH)).toEqual({
        text: sentinel(KEY_MISSING_IN_FRENCH, 'en-CA'),
        lang: 'en-CA',
      });
      expect(store.text('button.save').lang).toBe('fr-CA');
    });

    it('treats a blank French value as missing', async () => {
      TestBed.configureTestingModule({
        providers: provideFakeContent(withLabels(label('k', 'English', '   '))),
      });
      const store = await loadFakeContent('fr');
      expect(store.text('k')).toEqual({ text: 'English', lang: 'en-CA' });
    });

    it('tags only fallback text with a different lang', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      expect(store.langFor(store.text(KEY_MISSING_IN_FRENCH))).toBe('en-CA');
      expect(store.langFor(store.text('button.save'))).toBeNull();

      TestBed.inject(LanguageService).activate('en');
      expect(store.langFor(store.text(KEY_MISSING_IN_FRENCH))).toBeNull();
    });

    it('never tags empty text', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(store.langFor(store.text('no.such.key'))).toBeNull();
    });
  });

  describe('missing keys', () => {
    it('gives empty text, never the key, and warns once in development', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      expect(store.text('no.such.key')).toEqual({ text: '', lang: 'en-CA' });
      expect(store.text('no.such.key').text).not.toContain('no.such.key');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('no.such.key');
    });

    it('gives empty text before the content has loaded', () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      expect(TestBed.inject(ContentStore).text('button.save').text).toBe('');
    });
  });

  describe('placeholders and plurals', () => {
    it('replaces {name} placeholders and leaves unknown ones alone', async () => {
      TestBed.configureTestingModule({
        providers: provideFakeContent(
          withLabels(label('greet', 'Hello {name}, you have {count} and {other}')),
        ),
      });
      const store = await loadFakeContent('en');
      expect(store.text('greet', { name: 'Sam', count: 3 }).text).toBe(
        'Hello Sam, you have 3 and {other}',
      );
    });

    const plurals = withLabels(
      label('items.one', '{count} item', '{count} article'),
      label('items.other', '{count} items', '{count} articles'),
    );

    it('uses English plural rules: only 1 is singular', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent(plurals) });
      const store = await loadFakeContent('en');
      expect(store.plural('items', 0).text).toBe('0 items');
      expect(store.plural('items', 1).text).toBe('1 item');
      expect(store.plural('items', 2).text).toBe('2 items');
    });

    it('uses French plural rules: 0 and 1 are singular', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent(plurals) });
      const store = await loadFakeContent('fr');
      expect(store.plural('items', 0).text).toBe('0 article');
      expect(store.plural('items', 1).text).toBe('1 article');
      expect(store.plural('items', 2).text).toBe('2 articles');
    });
  });

  describe('snapshot', () => {
    it('sorts categories by sortOrder and priorities by level, highest first', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.snapshot().categories.map((c) => c.slug)).toEqual(['personal', 'work']);
      expect(store.snapshot().priorities.map((p) => p.slug)).toEqual(['high', 'low']);
    });

    it('sorts FAQ items by sortOrder', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.snapshot().faq.map((item) => item.id)).toEqual(['faqItem-1', 'faqItem-2']);
    });

    it('indexes pages by slug with their empty state', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      const home = store.snapshot().pages.get('home');
      expect(home?.title.text).toBe(sentinel('page.home.title', 'fr-CA'));
      expect(home?.emptyState?.heading.text).toBe(sentinel('emptyState.heading', 'fr-CA'));
    });

    it('exposes the app settings, with the logo and its alt text in the active language', async () => {
      TestBed.configureTestingModule({
        providers: provideFakeContent(fakeRawContent({ withLogo: true })),
      });
      const store = await loadFakeContent('fr');
      const settings = store.appSettings();
      expect(settings?.appTitle.text).toBe(sentinel('appSettings.appTitle', 'fr-CA'));
      expect(settings?.logo?.url).toBe('https://images.example/logo.png');
      expect(settings?.logo?.alt.text).toBe(sentinel('appSettings.logoAlt', 'fr-CA'));
    });

    it('has no logo when none is set', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.appSettings()?.logo).toBeNull();
    });

    it('is empty before loading', () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const snapshot = TestBed.inject(ContentStore).snapshot();
      expect(snapshot.appSettings).toBeNull();
      expect(snapshot.labels.size).toBe(0);
    });
  });

  describe('category and priority lookups', () => {
    function withMedium(): RawContent {
      const raw = fakeRawContent();
      raw.priorities.push({
        sys: { id: 'priority-medium', contentType: { sys: { id: 'priority' } } },
        fields: {
          label: { 'en-CA': 'P:medium', 'fr-CA': 'P:moyenne' },
          slug: { 'en-CA': 'medium' },
          level: { 'en-CA': 2 },
          colour: { 'en-CA': '#ffaa00' },
        },
      });
      return raw;
    }

    it('gives a category its name in the active language', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      expect(store.categoryName('work')?.text).toBe(sentinel('category.work', 'fr-CA'));
      expect(store.findCategory('work')?.colour).toBe('#6b4c9a');
    });

    it('gives no category name when the task has none', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.categoryName(null)).toBeNull();
      expect(store.categoryName(undefined)).toBeNull();
      expect(store.categoryName('')).toBeNull();
    });

    it('shows the uncategorized label for a category that no longer exists', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.categoryName('removed')?.text).toBe(sentinel('status.uncategorized', 'en-CA'));
      expect(store.findCategory('removed')).toBeNull();
    });

    it('gives a priority its label in the active language', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('fr');
      expect(store.priorityLabel('high').text).toBe(sentinel('priority.high', 'fr-CA'));
      expect(store.findPriority('high')?.colour).toBe('#b3261e');
    });

    it('shows the Medium label for an unknown priority', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent(withMedium()) });
      const store = await loadFakeContent('fr');
      expect(store.priorityLabel('urgent').text).toBe('P:moyenne');
      expect(store.findPriority('urgent')?.slug).toBe('medium');
    });

    it('gives empty text for an unknown priority when there is no Medium either', async () => {
      TestBed.configureTestingModule({ providers: provideFakeContent() });
      const store = await loadFakeContent('en');
      expect(store.priorityLabel('urgent').text).toBe('');
      expect(store.findPriority('urgent')).toBeNull();
    });
  });
});
