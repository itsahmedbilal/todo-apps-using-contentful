import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { assertNoLiteralText } from '../../../testing/assert-no-literal-text';
import { expectNoAxeViolations } from '../../../testing/axe';
import { loadFakeContent, provideFakeContent, sentinel } from '../../../testing/fake-content';
import { routes } from '../../app.routes';
import { LanguageService } from '../../core/i18n/language.service';
import { LanguageSwitcherComponent } from './language-switcher.component';

async function render(lang: 'en' | 'fr', url = '/') {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter(routes), ...provideFakeContent()] });
  await loadFakeContent(lang);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const fixture = TestBed.createComponent(LanguageSwitcherComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const link = () => element.querySelector<HTMLAnchorElement>('[data-testid="language-switcher"]')!;
  return { fixture, element, link, router: TestBed.inject(Router), harness };
}

describe('LanguageSwitcherComponent', () => {
  afterEach(() => localStorage.clear());

  it('offers French while English is active, named by language.name.fr', async () => {
    const { link } = await render('en', '/en/missing');
    expect(link().textContent).toBe(sentinel('language.name.fr', 'en-CA'));
    expect(link().getAttribute('href')).toBe('/fr/missing');
  });

  it('offers English while French is active, named by language.name.en', async () => {
    const { link } = await render('fr', '/fr/missing');
    expect(link().textContent).toBe(sentinel('language.name.en', 'fr-CA'));
    expect(link().getAttribute('href')).toBe('/en/missing');
  });

  it('keeps the rest of the address when switching', async () => {
    const { link } = await render('en', '/en/missing/page?x=1');
    expect(link().getAttribute('href')).toBe('/fr/missing/page?x=1');
  });

  it('marks the offered language name with that language, for screen readers', async () => {
    const { link } = await render('en', '/en/missing');
    expect(link().querySelector('[lang]')?.getAttribute('lang')).toBe('fr');
  });

  it('is a labelled group named by languageSwitcherLabel', async () => {
    const { element } = await render('en', '/en/missing');
    expect(element.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      sentinel('appSettings.languageSwitcherLabel', 'en-CA'),
    );
  });

  it('switches the address and language and remembers the choice', async () => {
    const { link, router, fixture } = await render('en', '/en/missing');
    link().click();
    await fixture.whenStable();
    expect(router.url).toBe('/fr/missing');
    expect(TestBed.inject(LanguageService).urlLang()).toBe('fr');
    expect(localStorage.getItem('todo.lang')).toBe('fr');
    expect(link().getAttribute('href')).toBe('/en/missing');
  });

  it('is a real link, so the keyboard reaches and activates it', async () => {
    const { link } = await render('en', '/en/missing');
    expect(link().tagName).toBe('A');
    expect(link().tabIndex).toBe(0);
  });

  it('renders no literal text and has no accessibility violations', async () => {
    const { element } = await render('fr', '/fr/missing');
    expect(() => assertNoLiteralText(element)).not.toThrow();
    await expectNoAxeViolations(element);
  });
});
