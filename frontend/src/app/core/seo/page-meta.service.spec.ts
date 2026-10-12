import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RawContent } from '../content/content.models';
import { LanguageService } from '../i18n/language.service';
import {
  fakeRawContent,
  loadFakeContent,
  provideFakeContent,
  sentinel,
} from '../../../testing/fake-content';
import { PageMetaService } from './page-meta.service';

const descriptionTag = () =>
  document.head.querySelector<HTMLMetaElement>('meta[name="description"]');

async function setup(raw: RawContent = fakeRawContent()) {
  TestBed.configureTestingModule({ providers: provideFakeContent(raw) });
  await loadFakeContent('en');
  const service = TestBed.inject(PageMetaService);
  runInInjectionContext(TestBed.inject(Injector), () => service.follow('home'));
  TestBed.tick();
}

describe('PageMetaService', () => {
  afterEach(() => {
    document.title = '';
    descriptionTag()?.remove();
  });

  it('sets the document title and meta description from the page entry', async () => {
    await setup();
    expect(document.title).toBe(sentinel('page.home.seoTitle', 'en-CA'));
    expect(descriptionTag()?.content).toBe(sentinel('page.home.seoDescription', 'en-CA'));
  });

  it('follows the active language', async () => {
    await setup();
    TestBed.inject(LanguageService).activate('fr');
    TestBed.tick();
    expect(document.title).toBe(sentinel('page.home.seoTitle', 'fr-CA'));
    expect(descriptionTag()?.content).toBe(sentinel('page.home.seoDescription', 'fr-CA'));
  });

  it('falls back to the page title when there is no SEO title', async () => {
    const raw = fakeRawContent();
    delete raw.pages[0].fields.seoTitle;
    await setup(raw);
    expect(document.title).toBe(sentinel('page.home.title', 'en-CA'));
  });

  it('falls back to the app title when the page has no title of its own or does not exist', async () => {
    const raw = fakeRawContent();
    raw.pages = [];
    await setup(raw);
    expect(document.title).toBe(sentinel('appSettings.appTitle', 'en-CA'));
  });

  it('removes the meta description when the page has none', async () => {
    const raw = fakeRawContent();
    delete raw.pages[0].fields.seoDescription;
    await setup(raw);
    expect(descriptionTag()).toBeNull();
  });
});
