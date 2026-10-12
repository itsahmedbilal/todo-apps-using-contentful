import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { NotFoundPage } from './not-found.page';

async function render(lang: 'en' | 'fr') {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...provideFakeContent()] });
  await loadFakeContent(lang);
  const fixture = TestBed.createComponent(NotFoundPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('NotFoundPage', () => {
  it('shows the heading, message and a link home in English', async () => {
    const element = await render('en');
    expect(element.querySelector('h1')?.textContent).toBe(sentinel('notFound.heading', 'en-CA'));
    expect(element.querySelector('p')?.textContent).toBe(sentinel('notFound.message', 'en-CA'));
    const link = element.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toBe(sentinel('notFound.backHome', 'en-CA'));
    expect(link.getAttribute('href')).toBe('/en');
  });

  it('sets the document title so the page has one', async () => {
    await render('fr');
    expect(TestBed.inject(Title).getTitle()).toBe(sentinel('notFound.heading', 'fr-CA'));
  });

  it('is localized in French, and links to the French home', async () => {
    const element = await render('fr');
    expect(element.querySelector('h1')?.textContent).toBe(sentinel('notFound.heading', 'fr-CA'));
    expect((element.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe('/fr');
  });

  it('renders no literal text in either language and has no accessibility violations', async () => {
    for (const lang of ['en', 'fr'] as const) {
      TestBed.resetTestingModule();
      const element = await render(lang);
      expect(() => assertNoLiteralText(element)).not.toThrow();
      await expectNoAxeViolations(element);
    }
  });
});
